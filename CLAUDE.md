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

1. **Update TodoWrite** - Mark task as completed
2. **Update `BST_EXECUTION_PLAN.md`**:
   - Mark the task as ✅ complete
   - Add files created/modified to the change record
   - Update the "最后更新" timestamp
3. **Verify** the plan reflects reality before moving to next task

## 核心编程约定


## File Locations

- `solver/src/hand.rs` - Hand class label/index mapping (169 hands)
- `solver/src/game_tree.rs` - Fixed action tree model
- `solver/src/solver.rs` - Core solver logic (CFR implementation planned)
- `solver/src/bin/solver_cli.rs` - JSON CLI interface
- `server/src/routes/solve.ts` - Main solve API endpoint
- `web/src/components/Heatmap.tsx` - 13x13 grid visualization
- `web/src/components/FrequencyBars.tsx` - Action frequency display

## Test-Driven Development

The project follows TDD as outlined in `docs/plans/2026-01-13-preflop-gto-solver-implementation-plan.md`. Tests should be written first and verified to fail before implementation.

## Avoiding Session Termination

**IMPORTANT**: Several scenarios have caused Claude Code sessions to terminate abnormally. Follow these guidelines to prevent data loss.

### Known Termination Scenarios

#### 1. Windows `taskkill` Command Syntax Error

**Problem**: Using `taskkill /F /IM node.exe` on Windows causes the session to terminate.

**Error**: Windows interprets `/F` as a path (`F:/`) rather than the force flag.

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

---

## Hooks 配置

**Location**: `.claude/settings.local.json`
