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
2. **Update `BST_EXECUTION_PLAN.md`**:
   - Mark the task as ✅ complete
   - Add files created/modified to the change record
   - Update the "最后更新" timestamp
3. **Verify** the plan reflects reality before moving to next task

**If you discover completed work not documented**: Update the docs immediately, then continue.


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

---

## Hooks Configuration

**Location**: `.claude/settings.local.json`
