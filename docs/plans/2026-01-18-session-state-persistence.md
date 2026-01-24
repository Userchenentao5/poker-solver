# Session State Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现会话状态持久化功能，让 AI 在 token 限制前自动保存进度，下次会话可以无缝恢复。

**Architecture:** 双文件混合方案 - `.claude/session-state.json` 存储结构化状态，与 `CURRENT_EXECUTION_PLAN.md` 配合使用。状态通过拦截 TodoWrite/Read/Edit/Write 操作收集，在三种时机触发保存：每次 todo 变化、token 达到 80%、每 5 分钟定时。

**Tech Stack:** Node.js (TypeScript), JSON, 文件系统操作

---

### Task 1: 创建会话状态类型定义

**Files:**
- Create: `.claude/types/session.ts`

**Step 1: 创建类型定义文件**

```typescript
// .claude/types/session.ts

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

export interface ModifiedFile {
  path: string;
  timestamp: string;
  changeType: "read" | "edit" | "write";
  summary: string;
}

export interface CurrentTaskContext {
  description?: string;
  context: {
    problem?: string;
    lastFiles: string[];
    lastCommand?: string;
  };
}

export interface TokenUsage {
  estimated: number;
  limit: number;
  percentage: number;
}

export interface SessionState {
  version: string;
  lastUpdated: string;
  tokenUsage: TokenUsage;
  todos: TodoItem[];
  currentTask?: CurrentTaskContext;
  modifiedFiles: ModifiedFile[];
  nextSteps: string[];
}

export const CURRENT_STATE_VERSION = "1.0";
export const TOKEN_LIMIT = 200000;
export const TOKEN_WARNING_THRESHOLD = 0.8; // 80%
```

**Step 2: 编译检查类型定义**

Run: `cd .claude && npx tsc --noEmit types/session.ts`
Expected: No errors (may need tsconfig.json)

**Step 3: 提交**

```bash
git add .claude/types/session.ts
git commit -m "feat: add session state type definitions"
```

---

### Task 2: 创建状态管理器核心

**Files:**
- Create: `.claude/core/stateManager.ts`

**Step 1: 编写状态管理器核心测试**

```typescript
// .claude/core/stateManager.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { SessionStateManager } from "./stateManager";

describe("SessionStateManager", () => {
  let manager: SessionStateManager;

  beforeEach(() => {
    manager = new SessionStateManager();
  });

  it("should initialize with empty state", () => {
    expect(manager.getState().todos).toEqual([]);
    expect(manager.getState().modifiedFiles).toEqual([]);
  });

  it("should update todos", () => {
    manager.updateTodos([
      { content: "Test task", status: "pending", activeForm: "Testing" }
    ]);
    expect(manager.getState().todos).toHaveLength(1);
  });

  it("should track file modifications", () => {
    manager.trackFileEdit("test.ts", "Added test function");
    expect(manager.getState().modifiedFiles).toHaveLength(1);
  });

  it("should calculate token percentage correctly", () => {
    manager.addTokenUsage(160000);
    expect(manager.getState().tokenUsage.percentage).toBe(80);
  });

  it("should detect when save is needed (token threshold)", () => {
    manager.addTokenUsage(160000); // 80%
    expect(manager.shouldSave()).toBe(true);
  });

  it("should detect when save is needed (todos changed)", () => {
    manager.updateTodos([{ content: "Test", status: "pending", activeForm: "Test" }]);
    manager.markSaved(); // Reset the flag
    manager.updateTodos([{ content: "Test2", status: "pending", activeForm: "Test2" }]);
    expect(manager.shouldSave()).toBe(true);
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd .claude && npx vitest run core/stateManager.test.ts`
Expected: FAIL with "SessionStateManager not defined"

**Step 3: 实现状态管理器**

```typescript
// .claude/core/stateManager.ts

import type {
  SessionState,
  TodoItem,
  ModifiedFile,
  CurrentTask,
  TokenUsage
} from "../types/session.js";
import { CURRENT_STATE_VERSION, TOKEN_LIMIT, TOKEN_WARNING_THRESHOLD } from "../types/session.js";

export class SessionStateManager {
  private state: SessionState;
  private hasUnsavedChanges: boolean = false;
  private lastSaveTime: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): SessionState {
    return {
      version: CURRENT_STATE_VERSION,
      lastUpdated: new Date().toISOString(),
      tokenUsage: {
        estimated: 0,
        limit: TOKEN_LIMIT,
        percentage: 0
      },
      todos: [],
      modifiedFiles: [],
      nextSteps: []
    };
  }

  getState(): SessionState {
    return { ...this.state };
  }

  updateTodos(todos: TodoItem[]): void {
    this.state.todos = todos;
    this.state.lastUpdated = new Date().toISOString();
    this.hasUnsavedChanges = true;
  }

  trackFileRead(filePath: string): void {
    this.trackFileChange(filePath, "read", "Read file");
  }

  trackFileEdit(filePath: string, summary: string): void {
    this.trackFileChange(filePath, "edit", summary);
  }

  trackFileWrite(filePath: string, summary: string): void {
    this.trackFileChange(filePath, "write", summary);
  }

  private trackFileChange(filePath: string, changeType: "read" | "edit" | "write", summary: string): void {
    // Remove duplicate entries for the same file
    this.state.modifiedFiles = this.state.modifiedFiles.filter(f => f.path !== filePath);

    this.state.modifiedFiles.push({
      path: filePath,
      timestamp: new Date().toISOString(),
      changeType,
      summary
    });
    this.state.lastUpdated = new Date().toISOString();
    this.hasUnsavedChanges = true;
  }

  addTokenUsage(tokens: number): void {
    this.state.tokenUsage.estimated += tokens;
    this.state.tokenUsage.percentage = (this.state.tokenUsage.estimated / this.state.tokenUsage.limit) * 100;
    this.state.lastUpdated = new Date().toISOString();
  }

  setCurrentTask(task: CurrentTask): void {
    this.state.currentTask = task;
    this.state.lastUpdated = new Date().toISOString();
    this.hasUnsavedChanges = true;
  }

  setNextSteps(steps: string[]): void {
    this.state.nextSteps = steps;
    this.state.lastUpdated = new Date().toISOString();
    this.hasUnsavedChanges = true;
  }

  shouldSave(): boolean {
    // Token threshold reached
    if (this.state.tokenUsage.percentage >= TOKEN_WARNING_THRESHOLD * 100) {
      return true;
    }

    // Has unsaved changes and 5 minutes passed since last save
    const fiveMinutes = 5 * 60 * 1000;
    if (this.hasUnsavedChanges && (Date.now() - this.lastSaveTime) > fiveMinutes) {
      return true;
    }

    return this.hasUnsavedChanges;
  }

  markSaved(): void {
    this.hasUnsavedChanges = false;
    this.lastSaveTime = Date.now();
  }

  getStateForSaving(): SessionState {
    return JSON.parse(JSON.stringify(this.state));
  }
}
```

**Step 4: 运行测试确认通过**

Run: `cd .claude && npx vitest run core/stateManager.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add .claude/core/stateManager.ts .claude/core/stateManager.test.ts
git commit -m "feat: add session state manager core"
```

---

### Task 3: 创建文件持久化层

**Files:**
- Create: `.claude/core/persistence.ts`
- Create: `.claude/core/persistence.test.ts`

**Step 1: 编写持久化测试**

```typescript
// .claude/core/persistence.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionPersistence } from "./persistence";
import type { SessionState } from "../types/session.js";
import { CURRENT_STATE_VERSION } from "../types/session.js";
import fs from "fs/promises";

const TEST_STATE_FILE = ".claude/test-session-state.json";

describe("SessionPersistence", () => {
  afterEach(async () => {
    try {
      await fs.unlink(TEST_STATE_FILE);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  it("should save session state to file", async () => {
    const persistence = new SessionPersistence(TEST_STATE_FILE);
    const state: SessionState = {
      version: CURRENT_STATE_VERSION,
      lastUpdated: new Date().toISOString(),
      tokenUsage: { estimated: 1000, limit: 200000, percentage: 0.5 },
      todos: [{ content: "Test", status: "pending", activeForm: "Testing" }],
      modifiedFiles: [],
      nextSteps: []
    };

    await persistence.save(state);

    const fileExists = await fs.access(TEST_STATE_FILE).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it("should load session state from file", async () => {
    const persistence = new SessionPersistence(TEST_STATE_FILE);
    const state: SessionState = {
      version: CURRENT_STATE_VERSION,
      lastUpdated: "2026-01-18T10:00:00Z",
      tokenUsage: { estimated: 5000, limit: 200000, percentage: 2.5 },
      todos: [{ content: "Loaded task", status: "in_progress", activeForm: "Loading" }],
      modifiedFiles: [],
      nextSteps: ["Continue loading"]
    };

    await persistence.save(state);
    const loaded = await persistence.load();

    expect(loaded).toEqual(state);
  });

  it("should return null if file doesn't exist", async () => {
    const persistence = new SessionPersistence(TEST_STATE_FILE);
    const loaded = await persistence.load();
    expect(loaded).toBeNull();
  });

  it("should detect if session state exists", async () => {
    const persistence = new SessionPersistence(TEST_STATE_FILE);

    expect(await persistence.exists()).toBe(false);

    const state: SessionState = {
      version: CURRENT_STATE_VERSION,
      lastUpdated: new Date().toISOString(),
      tokenUsage: { estimated: 0, limit: 200000, percentage: 0 },
      todos: [],
      modifiedFiles: [],
      nextSteps: []
    };

    await persistence.save(state);
    expect(await persistence.exists()).toBe(true);
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd .claude && npx vitest run core/persistence.test.ts`
Expected: FAIL with "SessionPersistence not defined"

**Step 3: 实现持久化层**

```typescript
// .claude/core/persistence.ts

import fs from "fs/promises";
import type { SessionState } from "../types/session.js";
import { CURRENT_STATE_VERSION } from "../types/session.js";

export class SessionPersistence {
  private filePath: string;

  constructor(filePath: string = ".claude/session-state.json") {
    this.filePath = filePath;
  }

  async save(state: SessionState): Promise<void> {
    try {
      const stateJson = JSON.stringify(state, null, 2);
      await fs.writeFile(this.filePath, stateJson, "utf-8");
    } catch (error) {
      console.error("Failed to save session state:", error);
      throw error;
    }
  }

  async load(): Promise<SessionState | null> {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const state = JSON.parse(content) as SessionState;

      // Version compatibility check
      if (state.version !== CURRENT_STATE_VERSION) {
        console.warn(`Session state version mismatch: expected ${CURRENT_STATE_VERSION}, got ${state.version}`);
        return null;
      }

      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      console.error("Failed to load session state:", error);
      return null;
    }
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to delete session state:", error);
      }
    }
  }
}
```

**Step 4: 运行测试确认通过**

Run: `cd .claude && npx vitest run core/persistence.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add .claude/core/persistence.ts .claude/core/persistence.test.ts
git commit -m "feat: add session state persistence layer"
```

---

### Task 4: 创建恢复 UI 组件

**Files:**
- Create: `.claude/ui/recoveryPrompt.ts`

**Step 1: 实现恢复提示功能**

```typescript
// .claude/ui/recoveryPrompt.ts

import type { SessionState } from "../types/session.js";

export interface RecoveryChoice {
  action: "restore" | "skip" | "delete";
}

export function formatRecoveryPrompt(state: SessionState): string {
  const lastUpdated = new Date(state.lastUpdated);
  const timeAgo = getTimeAgo(lastUpdated);
  const completedCount = state.todos.filter(t => t.status === "completed").length;
  const inProgressCount = state.todos.filter(t => t.status === "in_progress").length;
  const currentTask = state.currentTask?.description ||
                     state.todos.find(t => t.status === "in_progress")?.content ||
                     "无";

  return `
═══════════════════════════════════════════════════════════════
                    发现未保存的会话状态
═══════════════════════════════════════════════════════════════

📅 上次会话: ${lastUpdated.toLocaleString("zh-CN")} (${timeAgo})
🎯 当前任务: ${currentTask}
✅ 已完成: ${completedCount} 个任务
🔄 进行中: ${inProgressCount} 个任务
📝 修改文件: ${state.modifiedFiles.length} 个

${state.modifiedFiles.length > 0 ? "最近修改:\n" + state.modifiedFiles.slice(-3).map(f => `  - ${f.path}`).join("\n") : ""}

${state.nextSteps.length > 0 ? "下一步:\n" + state.nextSteps.map(s => `  • ${s}`).join("\n") : ""}

═══════════════════════════════════════════════════════════════

选项:
  [Y] 恢复此会话 - 恢复 todo 列表和上下文
  [N] 跳过 - 开始新会话（保留状态文件）
  [D] 删除 - 删除状态文件并开始新会话

═══════════════════════════════════════════════════════════════
`;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "刚刚";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  return `${Math.floor(seconds / 86400)} 天前`;
}

export function parseRecoveryChoice(input: string): RecoveryChoice | null {
  const normalized = input.trim().toLowerCase();

  if (normalized === "y" || normalized === "yes" || normalized === "恢复") {
    return { action: "restore" };
  }
  if (normalized === "n" || normalized === "no" || normalized === "跳过") {
    return { action: "skip" };
  }
  if (normalized === "d" || normalized === "delete" || normalized === "删除") {
    return { action: "delete" };
  }

  return null;
}
```

**Step 2: 创建测试文件**

```typescript
// .claude/ui/recoveryPrompt.test.ts

import { describe, it, expect } from "vitest";
import { formatRecoveryPrompt, parseRecoveryChoice } from "./recoveryPrompt";
import type { SessionState } from "../types/session.js";
import { CURRENT_STATE_VERSION } from "../types/session.js";

describe("RecoveryPrompt", () => {
  it("should format recovery prompt", () => {
    const state: SessionState = {
      version: CURRENT_STATE_VERSION,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      tokenUsage: { estimated: 50000, limit: 200000, percentage: 25 },
      todos: [
        { content: "Task 1", status: "completed", activeForm: "Task 1" },
        { content: "Task 2", status: "in_progress", activeForm: "Task 2" }
      ],
      currentTask: { description: "Testing", context: { lastFiles: ["test.ts"] } },
      modifiedFiles: [
        { path: "file1.ts", timestamp: "", changeType: "edit", summary: "Test" },
        { path: "file2.ts", timestamp: "", changeType: "write", summary: "Test 2" }
      ],
      nextSteps: ["Run tests", "Commit changes"]
    };

    const prompt = formatRecoveryPrompt(state);

    expect(prompt).toContain("发现未保存的会话状态");
    expect(prompt).toContain("当前任务: Testing");
    expect(prompt).toContain("已完成: 1 个任务");
    expect(prompt).toContain("file1.ts");
  });

  it("should parse recovery choice - yes", () => {
    expect(parseRecoveryChoice("y")).toEqual({ action: "restore" });
    expect(parseRecoveryChoice("Y")).toEqual({ action: "restore" });
    expect(parseRecoveryChoice("yes")).toEqual({ action: "restore" });
    expect(parseRecoveryChoice("恢复")).toEqual({ action: "restore" });
  });

  it("should parse recovery choice - no", () => {
    expect(parseRecoveryChoice("n")).toEqual({ action: "skip" });
    expect(parseRecoveryChoice("no")).toEqual({ action: "skip" });
    expect(parseRecoveryChoice("跳过")).toEqual({ action: "skip" });
  });

  it("should parse recovery choice - delete", () => {
    expect(parseRecoveryChoice("d")).toEqual({ action: "delete" });
    expect(parseRecoveryChoice("delete")).toEqual({ action: "delete" });
    expect(parseRecoveryChoice("删除")).toEqual({ action: "delete" });
  });

  it("should return null for invalid input", () => {
    expect(parseRecoveryChoice("invalid")).toBeNull();
    expect(parseRecoveryChoice("")).toBeNull();
  });
});
```

**Step 3: 运行测试**

Run: `cd .claude && npx vitest run ui/recoveryPrompt.test.ts`
Expected: PASS

**Step 4: 提交**

```bash
git add .claude/ui/recoveryPrompt.ts .claude/ui/recoveryPrompt.test.ts
git commit -m "feat: add session recovery prompt UI"
```

---

### Task 5: 创建工具调用拦截器

**Files:**
- Create: `.claude/core/toolInterceptor.ts`
- Create: `.claude/core/toolInterceptor.test.ts`

**Step 1: 编写拦截器测试**

```typescript
// .claude/core/toolInterceptor.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ToolInterceptor } from "./toolInterceptor";
import { SessionStateManager } from "./stateManager.js";

describe("ToolInterceptor", () => {
  let manager: SessionStateManager;
  let interceptor: ToolInterceptor;

  beforeEach(() => {
    manager = new SessionStateManager();
    interceptor = new ToolInterceptor(manager);
  });

  it("should intercept TodoWrite calls", () => {
    interceptor.interceptTodoWrite([
      { content: "Test task", status: "pending", activeForm: "Testing" }
    ]);

    expect(manager.getState().todos).toHaveLength(1);
  });

  it("should intercept Read calls", () => {
    interceptor.interceptRead("test.ts", "content here");
    expect(manager.getState().modifiedFiles).toHaveLength(1);
  });

  it("should intercept Edit calls", () => {
    interceptor.interceptEdit("test.ts", "old content", "new content");
    const files = manager.getState().modifiedFiles;
    expect(files).toHaveLength(1);
    expect(files[0].changeType).toBe("edit");
  });

  it("should intercept Write calls", () => {
    interceptor.interceptWrite("test.ts", "new file content");
    const files = manager.getState().modifiedFiles;
    expect(files).toHaveLength(1);
    expect(files[0].changeType).toBe("write");
  });

  it("should estimate token usage", () => {
    const tokens = interceptor.estimateTokens("sample content here");
    expect(tokens).toBeGreaterThan(0);
  });

  it("should track token usage over time", () => {
    interceptor.interceptRead("file1.ts", "x".repeat(1000));
    interceptor.interceptEdit("file2.ts", "old", "new");

    expect(manager.getState().tokenUsage.estimated).toBeGreaterThan(0);
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd .claude && npx vitest run core/toolInterceptor.test.ts`
Expected: FAIL with "ToolInterceptor not defined"

**Step 3: 实现拦截器**

```typescript
// .claude/core/toolInterceptor.ts

import { SessionStateManager } from "./stateManager.js";

const TOKENS_PER_CHAR = 0.3; // Rough estimate: ~0.3 tokens per character
const BASE_TOKEN_COST = 500; // Base cost for any operation

export class ToolInterceptor {
  private manager: SessionStateManager;

  constructor(manager: SessionStateManager) {
    this.manager = manager;
  }

  interceptTodoWrite(todos: Array<{ content: string; status: string; activeForm: string }>): void {
    this.manager.updateTodos(todos);
    this.addTokenUsage(BASE_TOKEN_COST);
  }

  interceptRead(filePath: string, content: string): void {
    this.manager.trackFileRead(filePath);
    this.addTokenUsage(this.estimateTokens(content) + BASE_TOKEN_COST);
  }

  interceptEdit(filePath: string, oldContent: string, newContent: string): void {
    const summary = this.generateEditSummary(oldContent, newContent);
    this.manager.trackFileEdit(filePath, summary);
    this.addTokenUsage(
      this.estimateTokens(oldContent) + this.estimateTokens(newContent) + BASE_TOKEN_COST
    );
  }

  interceptWrite(filePath: string, content: string): void {
    const summary = this.generateWriteSummary(content);
    this.manager.trackFileWrite(filePath, summary);
    this.addTokenUsage(this.estimateTokens(content) + BASE_TOKEN_COST);
  }

  interceptBash(command: string): void {
    this.manager.setCurrentTask({
      context: {
        lastCommand: command,
        lastFiles: []
      }
    });
    this.addTokenUsage(BASE_TOKEN_COST);
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length * TOKENS_PER_CHAR);
  }

  private generateEditSummary(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split("\n").length;
    const newLines = newContent.split("\n").length;
    return `Edit: ${oldLines} → ${newLines} lines`;
  }

  private generateWriteSummary(content: string): string {
    const lines = content.split("\n").length;
    return `Write: ${lines} lines`;
  }

  private addTokenUsage(tokens: number): void {
    this.manager.addTokenUsage(tokens);
  }

  shouldSave(): boolean {
    return this.manager.shouldSave();
  }

  async saveIfNeeded(): Promise<boolean> {
    if (this.shouldSave()) {
      const { SessionPersistence } = await import("./persistence.js");
      const persistence = new SessionPersistence();
      await persistence.save(this.manager.getStateForSaving());
      this.manager.markSaved();
      return true;
    }
    return false;
  }
}
```

**Step 4: 运行测试确认通过**

Run: `cd .claude && npx vitest run core/toolInterceptor.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add .claude/core/toolInterceptor.ts .claude/core/toolInterceptor.test.ts
git commit -m "feat: add tool call interceptor"
```

---

### Task 6: 创建自动保存调度器

**Files:**
- Create: `.claude/core/autoSaveScheduler.ts`

**Step 1: 实现定时保存**

```typescript
// .claude/core/autoSaveScheduler.ts

import { SessionStateManager } from "./stateManager.js";
import { SessionPersistence } from "./persistence.js";

export class AutoSaveScheduler {
  private manager: SessionStateManager;
  private interval: NodeJS.Timeout | null = null;
  private persistence: SessionPersistence;

  constructor(manager: SessionStateManager, persistence: SessionPersistence) {
    this.manager = manager;
    this.persistence = persistence;
  }

  start(intervalMinutes: number = 5): void {
    if (this.interval) {
      this.stop();
    }

    this.interval = setInterval(async () => {
      if (this.manager.shouldSave()) {
        await this.persistence.save(this.manager.getStateForSaving());
        this.manager.markSaved();
      }
    }, intervalMinutes * 60 * 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async saveNow(): Promise<void> {
    await this.persistence.save(this.manager.getStateForSaving());
    this.manager.markSaved();
  }
}
```

**Step 2: 集成到拦截器**

修改 `.claude/core/toolInterceptor.ts`，添加：

```typescript
// 在类属性中添加
private autoSave: AutoSaveScheduler | null = null;

// 添加方法
setAutoSave(scheduler: AutoSaveScheduler): void {
  this.autoSave = scheduler;
}

// 修改 shouldSave 方法
async saveIfNeeded(): Promise<boolean> {
  if (this.shouldSave()) {
    const { SessionPersistence } = await import("./persistence.js");
    const persistence = new SessionPersistence();
    await persistence.save(this.manager.getStateForSaving());
    this.manager.markSaved();

    // 如果达到 token 阈值，通知用户
    if (this.manager.getState().tokenUsage.percentage >= 80) {
      console.warn("⚠️ Token usage at 80%, session saved. Consider wrapping up.");
    }

    return true;
  }
  return false;
}
```

**Step 3: 提交**

```bash
git add .claude/core/autoSaveScheduler.ts .claude/core/toolInterceptor.ts
git commit -m "feat: add auto-save scheduler"
```

---

### Task 7: 创建 CLI 入口

**Files:**
- Create: `.claude/cli/index.ts`
- Create: `.claude/cli/check.ts`

**Step 1: 实现会话检查命令**

```typescript
// .claude/cli/check.ts

import { SessionPersistence } from "../core/persistence.js";
import { formatRecoveryPrompt, parseRecoveryChoice, type RecoveryChoice } from "../ui/recoveryPrompt.js";
import readline from "readline";

export async function checkAndPromptRecovery(): Promise<{
  action: "restore" | "skip" | "delete";
  state?: import("../types/session.js").SessionState;
}> {
  const persistence = new SessionPersistence();

  if (!(await persistence.exists())) {
    return { action: "skip" };
  }

  const state = await persistence.load();
  if (!state) {
    return { action: "skip" };
  }

  console.log(formatRecoveryPrompt(state));

  const choice = await promptUser();

  if (!choice) {
    console.log("无效输入，跳过恢复");
    return { action: "skip" };
  }

  if (choice.action === "delete") {
    await persistence.delete();
    console.log("状态文件已删除");
    return { action: "delete" };
  }

  if (choice.action === "restore") {
    return { action: "restore", state };
  }

  return { action: "skip" };
}

function promptUser(): Promise<RecoveryChoice | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("你的选择: ", (answer) => {
      rl.close();
      resolve(parseRecoveryChoice(answer));
    });
  });
}
```

**Step 2: 实现主入口**

```typescript
// .claude/cli/index.ts

#!/usr/bin/env node

import { checkAndPromptRecovery } from "./check.js";
import { TodoWrite } from "../tools/todoWrite.js"; // 假设的包装工具

async function main() {
  // 检查并提示恢复
  const recovery = await checkAndPromptRecovery();

  if (recovery.action === "restore" && recovery.state) {
    // 恢复 todo 列表
    await TodoWrite({
      todos: recovery.state.todos.map(t => ({
        content: t.content,
        status: t.status,
        activeForm: t.activeForm
      }))
    });

    console.log("\n✅ 会话已恢复!");
    if (recovery.state.nextSteps.length > 0) {
      console.log("\n下一步行动:");
      recovery.state.nextSteps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step}`);
      });
    }
    console.log();
  }

  // 启动自动保存
  const { SessionStateManager } = await import("../core/stateManager.js");
  const { SessionPersistence } = await import("../core/persistence.js");
  const { AutoSaveScheduler } = await import("../core/autoSaveScheduler.js");
  const { ToolInterceptor } = await import("../core/toolInterceptor.js");

  const manager = new SessionStateManager();
  const persistence = new SessionPersistence();
  const scheduler = new AutoSaveScheduler(manager, persistence);
  const interceptor = new ToolInterceptor(manager);

  interceptor.setAutoSave(scheduler);
  scheduler.start(5); // 每 5 分钟检查一次

  // 导出全局访问器供其他模块使用
  (global as any).__sessionInterceptor = interceptor;
}

main().catch(console.error);
```

**Step 3: 添加 package.json 脚本**

在 `.claude/package.json` 中添加：

```json
{
  "name": "claude-session",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx cli/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "typescript": "^5.3.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 4: 提交**

```bash
git add .claude/cli/
git commit -m "feat: add CLI entry point for session recovery"
```

---

### Task 8: 创建 package.json 和 tsconfig.json

**Files:**
- Create: `.claude/package.json`
- Create: `.claude/tsconfig.json`

**Step 1: 创建 package.json**

```json
{
  "name": "claude-session-persistence",
  "version": "1.0.0",
  "description": "Session state persistence for Claude Code",
  "type": "module",
  "main": "cli/index.ts",
  "scripts": {
    "start": "tsx cli/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["claude", "session", "persistence"],
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "tsx": "^4.7.0"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: 创建 vitest.config.ts**

```typescript
// .claude/vitest.config.ts

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    dir: "."
  }
});
```

**Step 4: 运行所有测试**

Run: `cd .claude && npm test`
Expected: All tests pass

**Step 5: 提交**

```bash
git add .claude/package.json .claude/tsconfig.json .claude/vitest.config.ts
git commit -m "chore: add build configuration"
```

---

### Task 9: 添加 README 和使用文档

**Files:**
- Create: `.claude/README.md`

**Step 1: 编写文档**

```markdown
# Claude Session State Persistence

会话状态持久化功能 - 在 token 限制前自动保存进度，支持下次无缝恢复。

## 功能

- ✅ 自动跟踪 todo 列表变化
- ✅ 跟踪文件修改（Read/Edit/Write）
- ✅ Token 使用量估算
- ✅ 三种保存触发方式：
  - 每次 todo 变化
  - Token 达到 80% 阈值
  - 每 5 分钟定时保存
- ✅ 会话恢复提示

## 使用方法

### 启动时检查

```bash
cd .claude
npm start
```

启动时会检查是否存在未保存的会话状态，如果存在则显示恢复提示。

### 编程接口

```typescript
import { ToolInterceptor } from "./core/toolInterceptor.js";
import { SessionStateManager } from "./core/stateManager.js";
import { SessionPersistence } from "./core/persistence.js";

const manager = new SessionStateManager();
const interceptor = new ToolInterceptor(manager);

// 拦截工具调用
interceptor.interceptTodoWrite(todos);
interceptor.interceptRead("file.ts", content);
interceptor.interceptEdit("file.ts", oldContent, newContent);

// 检查是否需要保存
if (interceptor.shouldSave()) {
  await interceptor.saveIfNeeded();
}
```

## 文件结构

```
.claude/
├── cli/
│   ├── index.ts          # CLI 入口
│   └── check.ts          # 会话检查和恢复提示
├── core/
│   ├── stateManager.ts   # 状态管理器
│   ├── persistence.ts    # 文件持久化
│   ├── toolInterceptor.ts # 工具调用拦截器
│   └── autoSaveScheduler.ts # 自动保存调度器
├── ui/
│   └── recoveryPrompt.ts # 恢复提示 UI
├── types/
│   └── session.ts        # 类型定义
├── session-state.json    # 保存的会话状态（运行时生成）
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 状态文件格式

`session-state.json` 包含：
- 版本信息
- 最后更新时间
- Token 使用情况
- Todo 列表
- 当前任务上下文
- 修改的文件列表
- 下一步行动
```

**Step 2: 提交**

```bash
git add .claude/README.md
git commit -m "docs: add session persistence README"
```

---

### Task 10: 集成测试

**Files:**
- Create: `.claude/integration/sessionLifecycle.test.ts`

**Step 1: 编写集成测试**

```typescript
// .claude/integration/sessionLifecycle.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionStateManager } from "../core/stateManager.js";
import { SessionPersistence } from "../core/persistence.js";
import { ToolInterceptor } from "../core/toolInterceptor.js";
import { AutoSaveScheduler } from "../core/autoSaveScheduler.js";
import { checkAndPromptRecovery } from "../cli/check.js";
import fs from "fs/promises";

const TEST_STATE_FILE = ".claude/test-integration-state.json";

describe("Session Lifecycle Integration", () => {
  afterEach(async () => {
    try {
      await fs.unlink(TEST_STATE_FILE);
    } catch {}
  });

  it("should complete full session lifecycle", async () => {
    // 1. 创建新会话
    const manager = new SessionStateManager();
    const persistence = new SessionPersistence(TEST_STATE_FILE);
    const interceptor = new ToolInterceptor(manager);

    // 2. 模拟用户操作
    interceptor.interceptTodoWrite([
      { content: "Task 1", status: "pending", activeForm: "Task 1" },
      { content: "Task 2", status: "pending", activeForm: "Task 2" }
    ]);

    interceptor.interceptRead("test.ts", "content here");
    interceptor.interceptEdit("test.ts", "old", "new");

    // 3. 保存会话
    await persistence.save(manager.getStateForSaving());

    // 4. 验证保存成功
    expect(await persistence.exists()).toBe(true);

    // 5. 模拟会话恢复
    const loadedState = await persistence.load();
    expect(loadedState).toBeDefined();
    expect(loadedState?.todos).toHaveLength(2);
    expect(loadedState?.modifiedFiles).toHaveLength(1);

    // 6. 清理
    await persistence.delete();
    expect(await persistence.exists()).toBe(false);
  });

  it("should trigger save at token threshold", async () => {
    const manager = new SessionStateManager();
    const persistence = new SessionPersistence(TEST_STATE_FILE);
    const interceptor = new ToolInterceptor(manager);

    // 模拟大量 token 使用
    for (let i = 0; i < 100; i++) {
      interceptor.interceptRead(`file${i}.ts`, "x".repeat(2000));
    }

    // 应该触发保存
    expect(interceptor.shouldSave()).toBe(true);
    expect(manager.getState().tokenUsage.percentage).toBeGreaterThan(80);
  });

  it("should recover and continue session", async () => {
    const manager = new SessionStateManager();
    const persistence = new SessionPersistence(TEST_STATE_FILE);

    // 保存初始状态
    const originalState = manager.getStateForSaving();
    originalState.todos = [
      { content: "Original task", status: "in_progress", activeForm: "Working" }
    ];
    originalState.nextSteps = ["Complete the task"];
    await persistence.save(originalState);

    // 模拟恢复检查
    const exists = await persistence.exists();
    expect(exists).toBe(true);

    const loaded = await persistence.load();
    expect(loaded?.todos[0].content).toBe("Original task");
    expect(loaded?.nextSteps).toEqual(["Complete the task"]);
  });
});
```

**Step 2: 运行集成测试**

Run: `cd .claude && npx vitest run integration/sessionLifecycle.test.ts`
Expected: PASS

**Step 3: 运行所有测试验证**

Run: `cd .claude && npm test`
Expected: All tests pass

**Step 4: 提交**

```bash
git add .claude/integration/sessionLifecycle.test.ts
git commit -m "test: add integration tests for session lifecycle"
```

---

## 验收标准

完成后，以下功能应该正常工作：

1. ✅ 运行 `cd .claude && npm test` - 所有测试通过
2. ✅ 运行 `cd .claude && npm start` - 显示恢复提示（如果有保存的状态）
3. ✅ Todo 变化时自动触发保存
4. ✅ Token 达到 80% 时自动保存并警告
5. ✅ 每 5 分钟定时保存（如果有变化）
6. ✅ 恢复后 todo 列表正确还原

## 下一步

- 考虑与 Claude Code 的工具调用深度集成
- 添加更多元数据（如 git commit hash）
- 实现状态文件压缩
- 添加 Web UI 查看会话状态
