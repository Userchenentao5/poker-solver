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

### Pre-Task Planning (REQUIRED)

Before starting any non-trivial task:

1. **Use TodoWrite** to break down the task into steps
2. **Set current task** using development state tracker: `npm run set-task "task description"`
3. **Add next steps** if needed: `npm run add-step "step description"`

Example:
```
User: "实现用户登录功能"
AI: [Uses TodoWrite to create:
  1. 创建登录 API 端点
  2. 实现验证逻辑
  3. 编写测试
  4. 更新文档]
   [Then runs: npm run set-task "实现用户登录功能"]
```

### Post-Task Update (REQUIRED)

After completing ANY task:

1. **Update TodoWrite** - Mark task as completed
2. **Update `CURRENT_EXECUTION_PLAN.md`**:
   - Mark the task as ✅ complete
   - Add files created/modified to the change record
   - Update the "最后更新" timestamp
3. **Verify** the plan reflects reality before moving to next task
4. **Check** `CLAUDE.md` Current Status section is accurate
5. **Save development state**: `npm run save-state`

**If you discover completed work not documented**: Update the docs immediately, then continue.

**This has happened multiple times. DO NOT skip this step.**

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

### Development State Tracker
```bash
# From .claude/ directory - tracks project development state manually
# Complements Claude Code's automatic session management

cd .claude
npm run show-state              # Show current development state
npm run save-state              # Save current state
npm run set-task "task desc"    # Set current task
npm run add-step "step desc"    # Add next action
npm run track-file "path"       # Record file modification
npm run clear-state             # Clear all state
```

**Usage Guidelines**:
- **Session start**: When user says "显示开发状态" or "show development state", run `npm run show-state`
- **Before token limit**: When user says "保存状态" or "save state", run `npm run save-state`
- **Task tracking**: When user sets a task, run `npm run set-task "description"`
- **Progress tracking**: When user adds next steps, run `npm run add-step "description"`

**Purpose**: Tracks project-level state (current task, modified files, next steps) separate from Claude Code's dialogue session management.

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
- 自动解析 `CURRENT_EXECUTION_PLAN.md` 提取任务进度
- 自动解析 `CLAUDE.md` 提取项目架构和命令
- 自动解析 `DEVELOPMENT_NOTES.md` 提取关键注意事项
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

## Test-Driven Development

The project follows TDD as outlined in `docs/plans/2026-01-13-preflop-gto-solver-implementation-plan.md`. Tests should be written first and verified to fail before implementation.

## Current Status

MVP is **functionally complete**. The CFR algorithm is fully implemented in `solver/src/preflop_optimized.rs` with:
- Kuhn Poker CFR verification (`cfr.rs`)
- Basic preflop CFR (`preflop.rs`)
- Optimized CFR with smart sampling (`preflop_optimized.rs`)
- Full-stack integration: Rust CLI → Server API → React UI
- Server-side caching (TTL: 1 hour, max 100 entries)
- **Development state tracker** (`.claude/dev-state-tracker.ts`):
  - Manual CLI tool for tracking project-level state
  - Commands: show-state, save-state, set-task, add-step, track-file
  - Complements Claude Code's automatic session management

See `CURRENT_EXECUTION_PLAN.md` for detailed task status.

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

## Development State Tracker

**Purpose**: Manually track project development state to resume work across Claude Code sessions.

**Location**: `.claude/` directory

### How It Works

The development state tracker is a **manual CLI tool** that you can invoke during conversations. It complements Claude Code's built-in session management:

| Claude Code Session | Development State Tracker |
|---------------------|--------------------------|
| Dialogue history/context | Project state (todos, files, next steps) |
| Cross-session continuity | Development progress records |
| Automatic management | Manual/on-demand usage |
| Conversation-level | Project-level |

### Usage

**Show current state**:
```
用户: 显示开发状态
AI: [runs `npm run show-state`]
```

**Save before token limit**:
```
用户: 保存状态
AI: [runs `npm run save-state`]
```

**Set current task**:
```
用户: 设置当前任务为"实现用户登录"
AI: [runs `npm run set-task "实现用户登录"`]
```

**Add next step**:
```
用户: 添加下一步：编写测试
AI: [runs `npm run add-step "编写测试"`]
```

**Track file modification**:
```
用户: 记录修改了 src/auth.ts
AI: [runs `npm run track-file "src/auth.ts"`]
```

### State File

Location: `.claude/.claude/dev-state.json`

```json
{
  "version": "1.0",
  "lastUpdated": "2026-01-18T19:38:36.274Z",
  "currentTask": {
    "description": "实现用户登录",
    "context": { "lastFiles": [], "lastCommand": "" }
  },
  "todos": [],
  "modifiedFiles": [
    { "path": "src/auth.ts", "timestamp": "...", "changeType": "edit", "summary": "..." }
  ],
  "nextSteps": ["编写测试", "提交代码"],
  "tokenUsage": { "estimated": 0, "limit": 200000, "percentage": 0 },
  "project": "poker-solver"
}
```

### When to Use

1. **Session start**: Check where you left off
2. **Before token limit**: Save current progress
3. **Completing a task**: Update state before moving on
4. **Planning**: Track next steps for future sessions

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
