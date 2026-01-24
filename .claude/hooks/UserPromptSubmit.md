---
name: UserPromptSubmit
description: 项目技能评估 - 评估可用技能、工具和 MCP 服务
---

# Project Skill Assessment Hook

## Purpose
在用户每次提交问题时自动评估当前项目可用的 Skills、Tools、MCP Servers 和 Plugins，确保充分利用可用资源。

## Event
`UserPromptSubmit` - 用户提交提示词时触发

## Instructions

**你必须在每次用户请求时执行以下技能评估流程，并明确输出日志到控制台。**

### 第一步：评估用户请求

针对用户的请求，评估以下资源是否需要使用：

**格式**: [资源名] - 是/否 - [理由]

#### Skills 评估
- frontend-design - [评估] - [创建高质量前端界面时]
- project-scope-note - [评估] - [记录项目级问题时]
- user-scope-note - [评估] - [记录全局常见问题时]
- superpowers:brainstorming - [评估] - [创意工作前需要探索需求时]
- superpowers:dispatching-parallel-agents - [评估] - [有2+个独立任务时]
- superpowers:executing-plans - [评估] - [执行已写好的实现计划时]
- superpowers:finishing-a-development-branch - [评估] - [完成开发分支需要整合决策时]
- superpowers:receiving-code-review - [评估] - [接收代码审查反馈时]
- superpowers:requesting-code-review - [评估] - [完成主要任务请求代码审查时]
- superpowers:subagent-driven-development - [评估] - [使用独立代理执行计划时]
- superpowers:systematic-debugging - [评估] - [遇到bug或异常行为时]
- superpowers:test-driven-development - [评估] - [实现功能或修复bug时]
- superpowers:using-git-worktrees - [评估] - [需要隔离开发时]
- superpowers:verification-before-completion - [评估] - [完成任务前需要验证时]
- superpowers:writing-plans - [评估] - [需要编写实现计划时]
- superpowers:writing-skills - [评估] - [创建新技能时]

#### MCP Servers 评估

**GitHub MCP** (`mcp__github__*`)
- `search_repositories` - [评估] - [搜索 GitHub 仓库时]
- `search_code` - [评估] - [搜索代码示例时]
- `get_file_contents` - [评估] - [获取远程仓库文件时]
- `create_repository` - [评估] - [创建新仓库时]
- `create_or_update_file` - [评估] - [在远程仓库创建/更新文件时]
- `create_pull_request` - [评估] - [创建 PR 时]
- `list_commits` - [评估] - [查看提交历史时]
- `issue_write` / `issue_read` - [评估] - [创建/读取 issue 时]
- `get_me` - [评估] - [获取当前用户信息时]

**Figma MCP** (`mcp__figma-remote-mcp__*`)
- `get_design_context` - [评估] - [生成 UI 代码时]
- `get_screenshot` - [评估] - [获取设计截图时]
- `generate_diagram` - [评估] - [生成流程图/架构图时]
- `add_code_connect_map` - [评估] - [映射 Figma 节点到代码时]
- `get_metadata` - [评估] - [获取设计元数据时]

**Web Reader** (`mcp__web_reader__webReader`)
- webReader - [评估] - [抓取网页内容并转换为 LLM 友好格式时]

**4.5v MCP (Vision)** (`mcp__4_5v_mcp__*`)
- `analyze_image` - [评估] - [需要 AI 分析图像内容时]

**List MCP Resources** (`ListMcpResourcesTool`)
- `ListMcpResourcesTool` - [评估] - [查看可用的 MCP 资源时]
- `ReadMcpResourceTool` - [评估] - [读取 MCP 资源内容时]

#### Project Tools 评估
- Rust/Cargo - [评估] - [修改 solver 时]
- Node/TypeScript - [评估] - [修改 server 时]
- React/Vite - [评估] - [修改 web UI 时]
- Git Worktrees - [评估] - [需要隔离开发时]

### 第二步：输出评估日志

**只输出评估为"是"的技能**，格式如下：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: [用户输入摘要]

✅ 触发的技能:
   - [技能名] - [理由]
   - [技能名] - [理由]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**如果没有任何技能被触发**，输出：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: [用户输入摘要]

✅ 无需特殊技能

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 第三步：激活决策

- 如果**有技能被触发** → **必须**使用 Skill 工具激活
- 如果**无技能被触发** → 直接处理，无需特殊说明

**重要**:
1. 此评估在**每次用户请求**时都必须执行
2. 评估日志必须**明确输出**到控制台
3. 只输出**触发的技能**，不输出未触发的
4. Skill 激活**必须使用 Skill 工具**

## Configuration Reference

### 当前项目上下文
```yaml
project:
  name: "BTS 翻牌前策略系统"
  current_phase: "阶段 1 (核心 MVP)"
  progress: "40%"

architecture:
  - layer: "Rust Core"
    path: "solver/"
    tools: ["cargo", "rustc"]
    description: "CFR 算法计算核心"

  - layer: "Node/Express API"
    path: "server/"
    tools: ["node", "npm", "tsx"]
    description: "中间层和缓存"

  - layer: "React UI"
    path: "web/"
    tools: ["vite", "npm"]
    description: "13x13 热力图可视化"

available_mcp:
  github:
    display_name: "GitHub MCP"
    tools:
      - search_repositories
      - search_code
      - search_issues
      - search_pull_requests
      - get_file_contents
      - create_repository
      - create_or_update_file
      - create_pull_request
      - list_commits
      - list_branches
      - list_tags
      - list_releases
      - issue_write / issue_read
      - pull_request_read / pull_request_review_write
      - get_me
      - get_label
      - assign_copilot_to_issue
      - request_copilot_review
      - get_commit
    usage: "GitHub 仓库管理、代码搜索、PR/Issue 操作"

  figma:
    display_name: "Figma Remote MCP"
    tools:
      - get_design_context
      - get_screenshot
      - generate_diagram
      - get_metadata
      - add_code_connect_map
      - get_code_connect_map
      - get_variable_defs
      - get_figjam
    usage: "获取 Figma 设计、生成 UI 代码、创建流程图"

  web_reader:
    display_name: "Web Reader"
    tools:
      - webReader
    usage: "抓取网页内容并转换为 Markdown/文本格式"

  vision:
    display_name: "4.5v MCP (Vision)"
    tools:
      - analyze_image
    usage: "AI 图像分析，支持 PNG/JPG/JPEG"

  mcp_resources:
    display_name: "MCP Resources"
    tools:
      - ListMcpResourcesTool
      - ReadMcpResourceTool
    usage: "查看和读取 MCP 服务器提供的资源"

skills_registry:
  frontend:
    - "frontend-design"

  workflow:
    - "superpowers:brainstorming"
    - "superpowers:writing-plans"
    - "superpowers:executing-plans"
    - "superpowers:test-driven-development"
    - "superpowers:systematic-debugging"
    - "superpowers:verification-before-completion"

  collaboration:
    - "superpowers:dispatching-parallel-agents"
    - "superpowers:subagent-driven-development"
    - "superpowers:requesting-code-review"
    - "superpowers:receiving-code-review"

  git:
    - "superpowers:using-git-worktrees"
    - "superpowers:finishing-a-development-branch"

  meta:
    - "superpowers:using-superpowers"
    - "superpowers:writing-skills"
    - "project-scope-note"
    - "user-scope-note"
```

## Evaluation Example

```
用户输入: "改进热力图的单元格对齐问题"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: 改进热力图的单元格对齐问题

✅ 触发的技能:
   - frontend-design - 热力图是 UI 组件，需要前端设计技能
   - superpowers:systematic-debugging - 需要排查对齐问题的根本原因
   - superpowers:verification-before-completion - 修复后需要验证对齐效果

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```
用户输入: "你好"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: 简单问候

✅ 无需特殊技能

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Output Format

评估日志应按以下格式输出（**只输出触发的技能**）：

### 有技能触发时：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: [用户输入摘要]

✅ 触发的技能:
   - [技能名] - [理由]
   - [技能名] - [理由]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 无技能触发时：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 技能评估
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 用户请求: [用户输入摘要]

✅ 无需特殊技能

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
