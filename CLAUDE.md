# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# 强制执行层

> 这些规则**必须始终遵循**，无论任务大小。

## 📋 Mandatory: Workflow Contract

#### Modes
- FULL: Hook-enforced sequential workflow. MUST invoke exactly ONE <skill> per turn (the next phase).
- LIGHT: Hook provides advisory routing (primary <skill> + candidate hint). Model may invoke any relevant skills as needed.
- NONE: No workflow injected by hook. Model may still invoke skills if relevant.

#### FULL Workflow Phases (strict)
BRAINSTORMING -> WORKTREES -> PLANNING -> EXECUTING -> IMPLEMENTING_TDD -> CODE_REVIEW -> (loop EXECUTING...) -> FINISHING -> DONE

- IMPLEMENTING_TDD uses: superpowers:test-driven-development
- CODE_REVIEW uses: superpowers:requesting-code-review
- If pending_review=true, CODE_REVIEW MUST happen before any next task.

#### FULL Instrumentation (required)
At the end of every assistant reply in FULL mode, output:

[WF_REPORT]
events=DESIGN_APPROVED|WORKTREE_READY|PLAN_APPROVED|TASK_DONE|REVIEW_DONE|READY_TO_FINISH|FINISHED
notes=<optional>
[/WF_REPORT]

Stop Hook uses this to advance phases and to enforce review-after-task.

#### Slash commands
If user input starts with a slash command (e.g. /commit), hooks should not interfere.

---

## ⚠️ Critical: Task Execution Workflow

**BEFORE starting any task**: Use `TodoWrite` to plan and track progress.

**AFTER completing any task**: Update documentation (`BTS_EXECUTION_PLAN.md`).

---

## 🛡️ Session Termination Prevention

**Windows `taskkill` Syntax Error**:

- ❌ `taskkill /F /IM node.exe` (interprets `/F` as path)
- ✅ `Stop-Process -Name node -Force` (PowerShell)
- ✅ `taskkill //F //IM node.exe` (double slashes)

**Safe Operation Guidelines**:
1. Prefer language tools (`cargo`, `npm`) over system commands
2. Verify before executing (`cargo check`, `npx tsx -e "..."`)
3. Use read-only commands when possible
4. Handle port conflicts gracefully

---

# 高频召回层

> 快速参考信息，每次会话开始时自动加载。

## 项目架构

三层架构扑克翻前前 GTO 求解器：
- **Rust Core** (`solver/`) - CFR 计算 + JSON CLI
- **Node/Express API** (`server/`) - 中间层 + 缓存
- **React UI** (`web/`) - 13×13 热力图可视化

> 当前工作目录: `.worktrees/preflop-mvp/`

## 关键技术栈

| Layer | Tech | Version |
|-------|------|---------|
| Solver | Rust | (Cargo.toml) |
| Server | Node.js + TypeScript + Express | (package.json) |
| Web | React + Vite | (package.json) |

## 核心编程约定

- **TDD**: 先写测试，验证失败后再实现
- **手牌表示**: 169 种标准组合 (AA, KK...AKs...AKo...)
- **行动树**: RFI → 3bet → 4bet → 5bet 层级结构

## 常用命令

```bash
# Rust Solver
cargo build -p solver
cargo test -p solver
cargo run -p solver --bin solver_cli

# Server
cd server && npm run dev

# Web UI
cd web && npm run dev

# Session Loader
cd .claude && npm run session
```

---

# 按需查询层

> 详细文档使用**链接引用**，避免 Context Rot。

## 详细架构文档

- [执行计划与任务状态](./BTS_EXECUTION_PLAN.md)
- [原始实现计划](./docs/plans/2026-01-13-preflop-gto-solver-implementation-plan.md)

## API 参考

- [Backend API 文档](./docs/API.md)

## 历史决策记录

- 详见 `BTS_EXECUTION_PLAN.md` 中的变更记录

## 文件位置映射

| Component | File Path |
|-----------|-----------|
| Hand mapping | `solver/src/hand.rs` |
| Action tree | `solver/src/game_tree.rs` |
| Solver core | `solver/src/solver.rs` |
| CLI interface | `solver/src/bin/solver_cli.rs` |
| Solve endpoint | `server/src/routes/solve.ts` |
| Heatmap component | `web/src/components/Heatmap.tsx` |
| Frequency bars | `web/src/components/FrequencyBars.tsx` |

## 已知问题

### Heatmap Cell Alignment
**问题**: 热力图单元格与轴标签对齐偏移

**解决方案**: 确保标签和单元格使用相同的 flex 属性
```css
.heatmap-cell, .heatmap-label {
  flex: 1 1 auto;
  aspect-ratio: 1;
}
```

---

## Hooks 配置

**Location**: `.claude/settings.local.json`

**UserPromptSubmit Hook**: 自动评估用户请求，触发相应技能
- Matcher: `"^(?!/).+$"` (排除斜杠命令)
- Command: `node .claude/hooks/user-prompt-submit.cjs`
