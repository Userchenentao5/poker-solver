# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📋 MANDATORY: Skill Assessment Workflow

**CRITICAL**: On EVERY user request, you MUST perform the following skill assessment:

### Step 1: Check for Trigger Keywords

Scan the user's input for these patterns:

| Keywords | Trigger Skill |
|----------|--------------|
| 修复、fix、调试、问题、bug、错误、异常 | `superpowers:systematic-debugging` |
| 实现、添加、创建、implement、add | `superpowers:test-driven-development` |
| UI、界面、组件、热力图、样式、React | `frontend-design` |
| 设计、构思、探索、brainstorm | `superpowers:brainstorming` |
| 规划、计划、如何实现、怎么写 | `superpowers:writing-plans` |
| 验证、检查、测试、verify | `superpowers:verification-before-completion` |

### Step 2: Output Assessment Log

Always output in this format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: [用户输入摘要]

✅ 触发的技能:
   - [技能名] - [理由]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If no skills triggered:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: [用户输入摘要]

✅ 无需特殊技能

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Activate Skills

**If any skill was triggered**, use the Skill tool to activate it BEFORE responding to the user.

---

## Project Overview

A local poker preflop GTO (Game Theory Optimal) solver with a three-tier architecture:
- **Rust core** (`solver/`) - Performs CFR-based calculations, exposes JSON CLI interface
- **Node/Express API** (`server/`) - Middleware between UI and solver, handles caching
- **React UI** (`web/`) - Renders 13x13 heatmaps and action frequency bars

The project uses git worktrees. Active development is in `.worktrees/preflop-mvp/`. When running commands or navigating files, use the worktree path.

## ⚠️ CRITICAL: Task Execution Workflow

**BEFORE starting any task**: You MUST use TodoWrite to plan and track progress.

**AFTER completing any task**: You MUST update documentation.

### Task Planning (REQUIRED)

Before starting any non-trivial task:
1. **Use TodoWrite** to break down the task into steps
2. **Track progress** by updating todo status as you work

### Post-Task Update (REQUIRED)

After completing ANY task:
1. **Update TodoWrite** - Mark task as completed
2. **Update `BTS_EXECUTION_PLAN.md`**:
   - Mark the task as ✅ complete
   - Add files created/modified to the change record
   - Update the "最后更新" timestamp

**If you discover completed work not documented**: Update the docs immediately, then continue.

## Common Commands

### Rust Solver
```bash
# From worktree root
cargo build -p solver
cargo test -p solver
cargo run -p solver --bin solver_cli
```

### Server (TypeScript/Express)
```bash
cd server
npm run dev      # Run with ts-node (direct TypeScript execution)
npm test         # Run Node.js built-in tests
```

### Session Loader (会话启动加载器)
```bash
# From .claude/ directory - 自动加载项目规划、进度和待办事项

cd .claude
npm run session         # Load and display project session summary
npm run show-plan       # Alias for npm run session
```

**显示内容**:
- 📁 项目名称和概览
- 📊 当前 MVP 状态
- 📈 任务完成进度 (百分比)
- 📝 最近修改的文件
- ⚡ 常用命令
- 💡 关键开发提示

**使用场景**:
- **会话开始**: 用户说 "加载会话" 或 "load session" 时运行
- **查看规划**: 用户说 "显示规划" 或 "show plan" 时运行
- **快速概览**: 需要快速了解项目当前状态时运行

**技术说明**:
- 自动解析 `BTS_EXECUTION_PLAN.md` 提取任务进度
- 自动解析 `CLAUDE.md` 提取项目架构和命令
- 支持调试模式: `DEBUG=1 npm run session`

### Web UI (Vite/React)
```bash
cd web
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
npm test         # Vitest
```

## Architecture

### Hand Representation
- Uses standard 169 hand class mapping: AA, KK, ..., AKs, AQs, ..., AKo, AQo, ...
- Hand labels are ordered: pairs first, then suited (diagonal above), then offsuit (below diagonal)
- Ranks: A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2

### Game Tree Structure
Fixed preflop action tree defined in `solver/src/game_tree.rs`:
```
Action enum: Fold, Open, Call, ThreeBet, FourBet, FiveBet
Node struct: contains actions Vec and children Vec
```
The tree follows RFI → 3bet → 4bet → 5bet hierarchy.

### Data Flow
1. User selects matchup (e.g., UTG vs BTN) and node in React UI
2. Express API receives request at `/solve` endpoint
3. Server checks cache (not yet implemented)
4. On cache miss: invokes Rust CLI with JSON request
5. Rust solver runs CFR algorithm (currently uniform stub)
6. Strategy matrix (169 × N actions) returned as JSON
7. UI renders 13x13 heatmap with hand labels and frequency bars

## File Locations

- `solver/src/hand.rs` - Hand class label/index mapping (169 hands)
- `solver/src/game_tree.rs` - Fixed action tree model
- `solver/src/solver.rs` - Core solver logic (CFR implementation planned)
- `solver/src/bin/solver_cli.rs` - JSON CLI interface
- `server/src/routes/solve.ts` - Main solve API endpoint
- `web/src/components/Heatmap.tsx` - 13x13 grid visualization
- `web/src/components/FrequencyBars.tsx` - Action frequency display
- `docs/API.md` - Backend API documentation (Spring Boot REST API)

## Test-Driven Development

The project follows TDD as outlined in `docs/plans/2026-01-13-preflop-gto-solver-implementation-plan.md`. Tests should be written first and verified to fail before implementation.

## Current Status

The project has pivoted to a **BTS (Bluff The Spot) preflop strategy system**:
- Using pre-computed GTO strategy data instead of real-time CFR calculation
- Server acts as data query service
- Frontend UI remains unchanged

**Phase 1 (Core MVP)** is complete:
- ✅ Core scenario data converted (BTN Open, BB vs BTN, BB vs UTG)
- ✅ Strategy API and Scenarios API implemented
- ✅ Frontend scenario selector and BTS strategy hook integrated

See `BTS_EXECUTION_PLAN.md` for detailed task status.

## Avoiding Session Termination

**IMPORTANT**: Several scenarios have caused Claude Code sessions to terminate abnormally. Follow these guidelines to prevent data loss.

### Known Termination Scenarios

#### 1. Windows `taskkill` Command Syntax Error

**Problem**: Using `taskkill /F /IM node.exe` on Windows causes the session to terminate.

**Error**: Windows interprets `/F` as a path (`F:/`) rather than the force flag.

**DO NOT use**:
```bash
taskkill /F /IM node.exe  # WRONG - will fail and may terminate session
```

**USE INSTEAD**:
```bash
# Option 1: Use PowerShell
Stop-Process -Name node -Force

# Option 2: Use proper Windows syntax
taskkill //F //IM node.exe

# Option 3: Check port and use different port instead
netstat -ano | findstr :3001
# Then use a different port if occupied
```

#### 2. Safe Operation Guidelines

To prevent session termination:

1. **Prefer language tools over system commands**
   - Use `cargo`, `npm`, `npx` instead of direct process management
   - Use `curl` for HTTP checks instead of complex scripts

2. **Verify before executing**
   - Use `npx tsx -e "import(...)"` to verify module syntax before running full server
   - Use `cargo check` before `cargo build` for quick syntax validation

3. **Use read-only commands when possible**
   - `grep`, `cat`, `head` are safer than commands that modify state
   - Test with `--dry-run` flags if available

4. **Handle port conflicts gracefully**
   - Check if port is occupied: `netstat -ano | findstr :PORT`
   - Use environment variable to specify alternative port
   - Let the user handle process management manually

## Known Issues & Solutions

### Heatmap Cell Alignment

**Problem**: The 13x13 heatmap cells sometimes become misaligned with the X/Y axis card labels (A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2).

**Root Cause**: Column labels and grid cells must have identical width calculations. If labels use fixed width (e.g., `width: 48px`) while cells use flex or percentage-based width, they will not align.

**Solution**: Ensure labels and cells use the **same flex properties**:
```css
/* Both must use identical flex behavior */
.heatmap-cell {
  flex: 1 1 auto;  /* grow, shrink, basis */
  aspect-ratio: 1;
}

.heatmap-label {
  flex: 1 1 auto;  /* SAME as cells */
  aspect-ratio: 1;
}
```

**Key Principle**: In a flex row with `gap`, all items must use the same sizing method for alignment. Using `flex: 1 1 auto` on both ensures proportional scaling and perfect alignment.

---

## Hooks Configuration

**Location**: `.claude/settings.local.json`

### UserPromptSubmit Hook

**Purpose**: 自动评估用户请求，触发相应的技能和工具。

**Matcher**: `"^(?!/).+$"` - 使用负向前瞻正则表达式，**排除斜杠命令**

```json
"UserPromptSubmit": [
  {
    "matcher": "^(?!/).+$",
    "hooks": [
      {
        "type": "command",
        "command": "node .claude/hooks/user-prompt-submit.cjs"
      }
    ]
  }
]
```

**行为**:
- ✅ `hello` → 触发评估
- ✅ `显示状态` → 触发评估
- ❌ `/help` → 不触发（内置命令）
- ❌ `/commit` → 不触发（skill 命令）

**修改说明**: 如需调整 matcher 规则，编辑 `.claude/settings.local.json` 中的 `matcher` 属性。
