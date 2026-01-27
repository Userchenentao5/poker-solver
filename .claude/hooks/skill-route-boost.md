# skill-route-boost.cjs 逻辑文档

## 概述

`skill-route-boost.cjs` 是 Claude Code 的 **UserPromptSubmit Hook**，负责根据用户输入自动路由到相应的 Skill。支持三种模式：

| 模式 | 说明 | 行为 |
|------|------|------|
| **FULL** | 严格工作流状态机 | 每次只激活一个 Skill，按阶段顺序执行 |
| **LIGHT** | 建议性路由 | 提供 primary + candidate 技能建议 |
| **NONE** | 无干预 | 不注入路由上下文 |

---

## 核心工作流程

```
用户输入
   │
   ├─→ 是否为斜杠命令? ─是→ 退出 (不干预)
   │
   ├─→ 计算 devScore (开发倾向分数)
   │
   ├─→ 推断 taskType (任务类型)
   │
   ├─→ 检测模式覆盖关键词 → 决定 mode
   │
   ├─→ 根据 mode 执行路由逻辑
   │      │
   │      ├─ FULL → 读取状态 → 更新阶段 → 选择 Skill
   │      ├─ LIGHT → 分析任务类型 → 选择 primary + candidate
   │      └─ NONE → 无路由
   │
   └─→ 输出 additionalContext 和 systemMessage
```

---

## 1. devScore 计算 (开发倾向评分)

根据用户输入的特征计算分数，判断是否为开发任务：

| 特征 | 权重 | 说明 |
|------|------|------|
| codeBlock | +4 | 包含代码块 |
| stackTrace | +4 | 包含错误堆栈 |
| multiFilePath | +3 | 包含 3+ 文件路径 |
| explicitDevVerbs | +3 | 包含"实现、新增、修复"等动词 |
| workflowWords | +4 | 包含"全流程、工作流"等词 |
| gitOps | +2 | 包含 git 操作相关 |
| tests | +2 | 包含测试相关 |
| planningWords | +2 | 包含计划相关词 |
| filePath | +2 | 包含文件路径 |
| numberedList | +1 | 包含编号列表 |

**负分项**：

| 特征 | 权重 | 说明 |
|------|------|------|
| pureQuestionStart | -3 | 以"是什么/为什么"开头 |
| veryShort | -2 | 输入少于 `full.veryShortThreshold` 字符（默认 40） |
| noActionWords | -2 | 无行动词汇的纯疑问 |

**阈值判定**：
- `devScore >= 9` + 长输入 + 非纯疑问 → FULL 模式
- `devScore >= 3` → LIGHT 模式
- 否则 → NONE 模式

---

## 2. taskType 推断 (任务类型分类)

用于 LIGHT 模式的技能选择：

| taskType | 触发条件 |
|----------|----------|
| `debug` | 包含 stackTrace 或 debugWords |
| `review` | 包含 reviewWords |
| `tdd` | 包含 tddWords 或 tests |
| `plan` | 包含 planningWords |
| `design` | 包含 designWords |
| `claude-plugin` | 包含 claudePluginWords |
| `pr` | 包含 prWords |
| `writing` | 包含 writingWords |
| `git` | 包含 gitOps |
| `node` | 包含 nodeWords |
| `js-modules` | 包含 jsModuleWords |
| `other` | 默认 |

---

## 3. FULL 模式状态机

### 阶段定义 (PHASES)

```
BRAINSTORMING → WORKTREES → PLANNING → EXECUTING → IMPLEMENTING_TDD → CODE_REVIEW → FINISHING → DONE
```

### 阶段与 Skill 映射

| 阶段 | Skill |
|------|-------|
| BRAINSTORMING | superpowers:brainstorming |
| WORKTREES | superpowers:using-git-worktrees |
| PLANNING | superpowers:writing-plans |
| EXECUTING | superpowers:executing-plans 或 subagent-driven-development |
| IMPLEMENTING_TDD | superpowers:test-driven-development |
| CODE_REVIEW | superpowers:requesting-code-review |
| FINISHING | superpowers:finishing-a-development-branch |

### 状态持久化

- **状态文件**: `.claude/logs/superpowers-state.json`
- **状态字段**:
  ```json
  {
    "mode": "FULL",
    "phase": "BRAINSTORMING",
    "pending_review": false,
    "session_id": "...",
    "workflow_id": "wf_...",
    "updated_at": "2026-01-27T..."
  }
  ```

### 关键规则

1. **pending_review 锁**: 如果 `pending_review=true`，强制停留在 CODE_REVIEW 阶段
2. **关键词驱动**: 用户输入特定关键词可手动推进阶段
3. **WF_REPORT 报告**: 每次 FULL 模式回复末尾必须输出 `[WF_REPORT]` 块供 Stop Hook 读取

---

## 4. LIGHT 模式路由

### 技能选择逻辑

| taskType | Primary Skill | Candidate Skill (条件触发) |
|----------|---------------|---------------------------|
| debug | systematic-debugging | - |
| review | receiving-code-review | - |
| tdd | test-driven-development | - |
| plan | writing-plans | executing-plans (有 executePlanWords) |
| design | frontend-design | - |
| claude-plugin | developing-claude-code-plugins | - |
| pr | create-pr | finishing-a-development-branch |
| writing | writing-clearly-and-concisely | - |
| git | using-git-worktrees | - |
| node | systematic-debugging | - |
| default | brainstorming | test-driven-development (有 implementWords) |

### 输出格式

```
LIGHT ROUTING (advisory):
- primary: <skill> — <reason>
  <skill>...</skill>
- candidate: <skill> — <reason> (可选)
```

---

## 5. 配置系统

### 配置文件

- **主配置**: `.claude/hooks/skills-route-boost.config.json`
- **默认配置**: 内置 DEFAULT_CONFIG 常量
- **合并策略**: 深度合并 (deepMerge)，用户配置覆盖默认值

### 可配置项

```javascript
{
  thresholds: { full: 9, light: 3 },
  full: {
    minChars: 60,
    veryShortThreshold: 40,
    requireNotPureQuestionStart: true
  },
  modeOverrides: {
    full: "正则匹配 FULL 模式关键词",
    light: "正则匹配 LIGHT 模式关键词",
    reset: "正则匹配重置关键词"
  },
  weights: { /* 各特征权重 */ },
  patterns: { /* 各特征正则 */ },
  lightRouting: {
    maxCandidates: 2
  },
  stopGuard: {
    blockOnMissingReview: true,
    tailBytes: 1048576,
    wfReportStart: "[WF_REPORT]",
    wfReportEnd: "[/WF_REPORT]"
  }
}
```

**配置项说明**：

| 节点 | 字段 | 默认值 | 说明 |
|------|------|--------|------|
| `thresholds` | `full` | 9 | FULL 模式 devScore 最低阈值 |
| | `light` | 3 | LIGHT 模式 devScore 最低阈值 |
| `full` | `minChars` | 60 | FULL 模式要求的最小输入字符数 |
| | `veryShortThreshold` | 40 | 触发 `veryShort` 负分项的字符上限 |
| | `requireNotPureQuestionStart` | true | 是否要求非纯疑问句开头 |
| `lightRouting` | `maxCandidates` | 2 | 最多返回几个候选技能 |
| `stopGuard` | `blockOnMissingReview` | true | 是否阻止缺少 review 的工作流 |
| | `tailBytes` | 1048576 | 读取回复末尾的字节数（检测 WF_REPORT） |
| | `wfReportStart/End` | - | WF_REPORT 标记格式 |

### 环境变量覆盖

- `CLAUDE_DEV_SCORE_FULL`: 覆盖 full 阈值
- `CLAUDE_DEV_SCORE_LIGHT`: 覆盖 light 阈值

---

## 6. 日志系统

### 日志文件

| 文件 | 格式 | 内容 |
|------|------|------|
| `.claude/logs/skill-route.log` | 文本 | 可读性强的路由日志 |
| `.claude/logs/skill-routing.log.jsonl` | JSONL | 机器可读的结构化日志 |

### 日志内容

```
============================================================
[2026-01-27T...]
Mode: LIGHT
Task Type: claude-plugin
DevScore: -2
Thresholds: full=9, light=3
Score Breakdown:
  -2: veryShort
Triggered Skills:
  - superpowers:developing-claude-code-plugins (Primary: Claude hooks/skills：按插件开发方式处理)
User Input: "阅读skill-route-boost.cjs逻辑，将逻辑梳理成文档"
============================================================
```

---

## 7. UserPromptSubmit.md 作用

Hook 读取 `.claude/hooks/UserPromptSubmit.md` 的 `## Instructions` 部分，作为基础指令注入到 `additionalContext` 中。

如果读取失败，使用 fallback 指令：

```
MANDATORY: On every user request, evaluate whether any Skill applies.
If in FULL mode, obey the workflow phase and invoke exactly ONE <skill>.
```

---

## 8. Hook 输出

### JSON 输出格式

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "完整注入到上下文的内容"
  },
  "systemMessage": "简短的系统消息"
}
```

### additionalContext 组成

1. `baseInstructions` (来自 UserPromptSubmit.md)
2. `[ROUTING_HINT]` 块 (mode, taskType, devScore, thresholds)
3. 模式特定指令 (FULL/LIGHT/NONE)

---

## 9. 关键函数索引

| 函数 | 作用 |
|------|------|
| `computeDevScore()` | 计算开发倾向分数 |
| `inferTaskType()` | 推断任务类型 |
| `pickLightPrimaryAndCandidate()` | LIGHT 模式技能选择 |
| `readState()` / `writeJsonFileAtomic()` | 状态持久化 |
| `updateFullPhaseByUser()` | FULL 模式阶段转换 |
| `nextSkillForPhase()` | 阶段 → Skill 映射 |
| `buildAdditionalContext()` | 构建注入上下文 |
| `logSkillRoute()` | 写入可读日志 |

---

## 10. 错误处理

- 所有文件操作都有 try-catch 保护
- 读取失败时提供 fallback 值
- `uncaughtException` 捕获：输出降级上下文而非崩溃
