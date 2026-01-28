#!/usr/bin/env node
/**
 * .claude/hooks/skills-route-boost.cjs
 *
 * UserPromptSubmit router for Claude Code:
 * - NONE/LIGHT: advisory routing (primary + candidate)
 * - FULL: strict workflow state machine, exactly ONE <skill> per turn
 *
 * FULL phases now explicitly include:
 * - IMPLEMENTING_TDD -> superpowers:test-driven-development
 * - CODE_REVIEW      -> superpowers:requesting-code-review
 *
 * State file:
 *   .claude/logs/superpowers-state.json
 *
 * Config file:
 *   .claude/hooks/skills-route-boost.config.json
 */

const fs = require("fs");
const path = require("path");

// ---------------------- Paths ----------------------
const projectDir =
  process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, "..", "..");

const logDir = path.join(projectDir, ".claude", "logs");
const logFile = path.join(logDir, "skill-routing.log.jsonl");
const skillRouteLogFile = path.join(logDir, "skill-route.log");
const stateFile = path.join(logDir, "superpowers-workflow-state.json");

const scriptDir = path.dirname(process.argv[1]);
const configFile = path.join(scriptDir, "skills-route-boost.config.json");

// Ensure log dir exists
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch {
  /* ignore */
}

// ---------------------- Utilities ----------------------
function normalize(s) {
  return String(s || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}
function safeJsonParse(s, fallback = null) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
function readJsonFileSafe(p, fallback = null) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return safeJsonParse(fs.readFileSync(p, "utf-8"), fallback);
  } catch {
    return fallback;
  }
}
function writeJsonFileAtomic(p, obj) {
  try {
    const tmp = `${p}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf-8");
    fs.renameSync(tmp, p);
  } catch {
    /* ignore */
  }
}
function appendJsonl(p, obj) {
  try {
    fs.appendFileSync(p, JSON.stringify(obj) + "\n", "utf-8");
  } catch {
    /* ignore */
  }
}

// ---------------------- Skill Route Logging ----------------------
function logSkillRoute(timestamp, mode, devScore, taskType, selected, userInputSnippet) {
  try {
    const lines = [];
    const separator = "=".repeat(60);

    lines.push(separator);
    lines.push(`[${timestamp}]`);
    lines.push(`Mode: ${mode}`);
    lines.push(`Task Type: ${taskType}`);
    lines.push(`DevScore: ${devScore.score}`);
    lines.push(`Thresholds: full=${devScore.thresholds?.full || 'N/A'}, light=${devScore.thresholds?.light || 'N/A'}`);

    // DevScore breakdown
    if (devScore.reasons && devScore.reasons.length > 0) {
      lines.push(`Score Breakdown:`);
      devScore.reasons.forEach(r => {
        const sign = r.points >= 0 ? '+' : '';
        lines.push(`  ${sign}${r.points}: ${r.why}`);
      });
    }

    // Triggered skills
    lines.push(`Triggered Skills:`);
    if (mode === "FULL") {
      lines.push(`  - ${selected.nextSkill} (Phase: ${selected.phase})`);
      if (selected.pending_review) {
        lines.push(`  [PENDING REVIEW - Must complete CODE_REVIEW]`);
      }
    } else if (mode === "LIGHT") {
      lines.push(`  - ${selected.primary?.skill} (Primary: ${selected.primary?.reason})`);
      if (selected.candidate) {
        lines.push(`  - ${selected.candidate.skill} (Candidate: ${selected.candidate.reason})`);
      }
    } else {
      lines.push(`  - None (NONE mode)`);
    }

    // User input snippet
    const snippet = userInputSnippet ? userInputSnippet.substring(0, 100) + (userInputSnippet.length > 100 ? '...' : '') : '';
    lines.push(`User Input: "${snippet}"`);
    lines.push(separator);
    lines.push(''); // blank line separator

    fs.appendFileSync(skillRouteLogFile, lines.join('\n') + '\n', 'utf-8');
  } catch (e) {
    // Silently fail to avoid breaking the hook
  }
}

// Slash command detection:
// treat "/cmd ..." as slash command; do not treat "/a/b" as slash command
function isSlashCommand(input) {
  if (!input || typeof input !== "string") return false;
  const firstWord = input.trim().split(/\s+/)[0];
  return /^\/[^\/\s]+$/.test(firstWord);
}

function safeReadBaseInstructions() {
  return [
    "MANDATORY: On every user request, evaluate whether any Skill applies.",
    "If in FULL mode, obey the workflow phase and invoke exactly ONE <skill>.",
  ].join("\n");
}

function deepMerge(a, b) {
  if (!b || typeof b !== "object") return a;
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const k of Object.keys(b)) {
    const bv = b[k];
    const av = out[k];
    if (
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv) &&
      av &&
      typeof av === "object" &&
      !Array.isArray(av)
    ) {
      out[k] = deepMerge(av, bv);
    } else {
      out[k] = bv;
    }
  }
  return out;
}

// ---------------------- Config ----------------------
const DEFAULT_CONFIG = {
  thresholds: { full: 9, light: 3 },
  full: {
    minChars: 120,
    veryShortThreshold: 80,
    requireNotPureQuestionStart: true,
  },
  modeOverrides: {
    full: "(^|\\s)#(full|workflow)\\b|严格工作流|按.*工作流|全流程开发|端到端",
    light: "(^|\\s)#(light|quick)\\b|小问题|快速|顺手",
    reset: "(^|\\s)#(reset_workflow|workflow_off)\\b|结束工作流|退出工作流",
  },
  weights: {
    codeBlock: 4,
    stackTrace: 4,
    filePath: 2,
    multiFilePath: 3,
    gitOps: 2,
    tests: 2,
    explicitDevVerbs: 3,
    planningWords: 2,
    workflowWords: 4,
    numberedList: 1,

    pureQuestionStart: -3,
    veryShort: -2,
    noActionWords: -2,
  },
  patterns: {
    codeBlock: "```[\\s\\S]*?```",
    stackTrace:
      "\\bTraceback\\b|\\bStack trace\\b|\\bException\\b|\\bError:\\b|\\bat\\s+\\S+\\(\\S+:\\d+\\)",
    filePath:
      "(^|[\\s(])([A-Za-z]:\\\\\\\\|/)[^\\s]+|(^|[\\s(])(\\.\\.?/)[^\\s]+",
    gitOps:
      "\\b(git|commit|push|merge|rebase|cherry-pick|worktree|branch|PR|pull request)\\b",
    tests: "\\b(test|tests|vitest|jest|junit|pytest|coverage|ci)\\b",
    explicitDevVerbs:
      "(实现|新增|添加|开发|重构|改造|修复|排查|调试|落地|对接|集成|编写|生成|更新|优化|部署|发布|回滚|合并|分支)",
    planningWords: "(方案|设计|计划|拆解|步骤|roadmap|\\bplan\\b)",
    workflowWords: "(整套|全流程|端到端|workflow|工作流|严格工作流|按.*流程)",
    pureQuestionStart:
      "^\\s*(是什么|为什么|为啥|如何|怎么|能否|是否|what|why|how)\\b",
    numberedList: "^\\s*(\\d+[\\.\\)]|-|\\*)\\s+",
    actionWordAnywhere:
      "(实现|新增|添加|开发|重构|改造|修复|排查|调试|写|做|完成|提交|合并|发布|执行)",
    writingWords: "(写(文案|说明|描述)|撰写|写作|写作规范|清晰.*简洁|commit.*message|提交信息|document|description|comment)",
  },
  lightRouting: {
    maxCandidates: 2, // primary + candidate
  },
};

function compileRegexMap(patterns, flagsByKey = {}) {
  const out = {};
  for (const [k, v] of Object.entries(patterns || {})) {
    const flags = flagsByKey[k] || "i";
    out[k] = new RegExp(v, flags);
  }
  return out;
}

function loadConfig() {
  const loaded = readJsonFileSafe(configFile, null);
  const merged = deepMerge(DEFAULT_CONFIG, loaded || {});
  merged._re = {
    modeOverrides: {
      full: new RegExp(merged.modeOverrides.full, "i"),
      light: new RegExp(merged.modeOverrides.light, "i"),
      reset: new RegExp(merged.modeOverrides.reset, "i"),
    },
    patterns: compileRegexMap(
      merged.patterns,
      { codeBlock: "m", numberedList: "m", filePath: "m", pureQuestionStart: "i" }
    ),
  };

  // Optional env overrides
  if (process.env.CLAUDE_DEV_SCORE_FULL) {
    const v = Number(process.env.CLAUDE_DEV_SCORE_FULL);
    if (!Number.isNaN(v)) merged.thresholds.full = v;
  }
  if (process.env.CLAUDE_DEV_SCORE_LIGHT) {
    const v = Number(process.env.CLAUDE_DEV_SCORE_LIGHT);
    if (!Number.isNaN(v)) merged.thresholds.light = v;
  }

  return merged;
}

// ---------------------- devScore ----------------------
function countMatches(text, re) {
  if (!text) return 0;
  const rg = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  const m = text.match(rg);
  return m ? m.length : 0;
}

function computeDevScore(rawInput, cfg) {
  const text = normalize(rawInput);
  const w = cfg.weights;
  const p = cfg._re.patterns;

  let score = 0;
  const reasons = [];

  function add(points, why) {
    score += points;
    reasons.push({ points, why });
  }

  if (p.workflowWords.test(text)) add(w.workflowWords, "workflowWords");
  if (p.codeBlock.test(rawInput)) add(w.codeBlock, "codeBlock");
  if (p.stackTrace.test(rawInput)) add(w.stackTrace, "stackTrace");
  if (p.gitOps.test(rawInput)) add(w.gitOps, "gitOps");
  if (p.tests.test(rawInput)) add(w.tests, "tests");
  if (p.explicitDevVerbs.test(rawInput)) add(w.explicitDevVerbs, "explicitDevVerbs");
  if (p.tddWords && p.tddWords.test(rawInput)) add(Number(w.tddWords ?? 0), "tddWords");
  if (p.prWords && p.prWords.test(rawInput)) add(Number(w.prWords ?? 0), "prWords");
  if (p.writingWords && p.writingWords.test(rawInput)) add(Number(w.writingWords ?? 0), "writingWords");
  if (p.planningWords.test(rawInput)) add(w.planningWords, "planningWords");
  if (p.numberedList.test(rawInput)) add(w.numberedList, "numberedList");

  const fpCount = countMatches(rawInput, p.filePath);
  if (fpCount >= 1) add(w.filePath, `filePath(x${fpCount})`);
  if (fpCount >= 3) add(w.multiFilePath, `multiFilePath(x${fpCount})`);

  if (text.length < (cfg.full?.veryShortThreshold ?? 80)) add(w.veryShort, "veryShort");
  if (p.pureQuestionStart.test(text)) add(w.pureQuestionStart, "pureQuestionStart");
  if (!p.actionWordAnywhere.test(text) && p.pureQuestionStart.test(text)) add(w.noActionWords, "noActionWords");

  return { score, reasons };
}

// ---------------------- Task type heuristics (LIGHT) ----------------------
function inferTaskType(userInput, cfg) {
  const p = cfg._re.patterns;
  const t = normalize(userInput);

  // 1) Debug 优先（包含 stacktrace 或明确报错词）
  if ((p.stackTrace && p.stackTrace.test(t)) || (p.debugWords && p.debugWords.test(t))) return "debug";

  // 2) Review（用户要你 review 代码/PR）
  if (p.reviewWords && p.reviewWords.test(t)) return "review";

  // 3) TDD / Tests
  if ((p.tddWords && p.tddWords.test(t)) || (p.tests && p.tests.test(t))) return "tdd";

  // 4) Plan
  if (p.planningWords && p.planningWords.test(t)) return "plan";

  // 5) Frontend design（项目技能）
  if (p.designWords && p.designWords.test(t)) return "design";

  // 6) Claude hooks/skills/plugins（对应你的相关技能）
  if (p.claudePluginWords && p.claudePluginWords.test(t)) return "claude-plugin";

  // 7) PR
  if (p.prWords && p.prWords.test(t)) return "pr";

  // 8) Writing / Documentation
  if (p.writingWords && p.writingWords.test(t)) return "writing";

  // 9) 其他：保留你原有的栈分类（可选）
  if (p.gitOps && p.gitOps.test(t)) return "git";
  if (p.nodeWords && p.nodeWords.test(t)) return "node";
  if (p.jsModuleWords && p.jsModuleWords.test(t)) return "js-modules";

  return "other";
}


function pickLightPrimaryAndCandidate(userInput, taskType, cfg) {
  const text = normalize(userInput);
  const p = cfg?._re?.patterns || {};

  const isBug = (p.debugWords && p.debugWords.test(text)) || (p.stackTrace && p.stackTrace.test(text));
  const isPlan = p.planningWords && p.planningWords.test(text);
  const isExecutePlan = p.executePlanWords && p.executePlanWords.test(text);
  const isImplement = p.implementWords && p.implementWords.test(text);
  const isPR = p.prWords && p.prWords.test(text);
  const isVerify = p.verifyWords && p.verifyWords.test(text);
  const isReview = p.reviewWords && p.reviewWords.test(text);

  // primary
  let primary = { skill: "superpowers:brainstorming", reason: "默认：先澄清需求与约束" };
  if (taskType === "debug" || isBug) {
    primary = { skill: "superpowers:systematic-debugging", reason: "异常/失败类问题：系统化排查" };
  } else if (taskType === "review" || isReview) {
    primary = { skill: "superpowers:receiving-code-review", reason: "代码审查/Review：按 review 规范给出反馈" };
  } else if (taskType === "tdd") {
    primary = { skill: "superpowers:test-driven-development", reason: "TDD/测试驱动：先定义测试与验收再实现" };
  } else if (taskType === "plan" || isPlan) {
    primary = { skill: "superpowers:writing-plans", reason: "需要计划/步骤：输出可执行任务拆解" };
  } else if (taskType === "design") {
    primary = { skill: "frontend-design", reason: "前端设计/交互：使用项目 frontend-design 规范" };
  } else if (taskType === "claude-plugin") {
    primary = { skill: "superpowers:developing-claude-code-plugins", reason: "Claude hooks/skills：按插件开发方式处理" };
  } else if (taskType === "pr") {
    primary = { skill: "create-pr", reason: "创建/提交 PR：按项目 create-pr 规范生成 PR" };
  } else if (taskType === "writing") {
    primary = { skill: "elements-of-style:writing-clearly-and-concisely", reason: "写作/文档/文案：应用 Strunk 规则使文字清晰简洁" };
  } else if (taskType === "git") {
    primary = { skill: "superpowers:using-git-worktrees", reason: "Git 分支/Worktree：优先用 worktrees 流程" };
  } else if (taskType === "node") {
    primary = { skill: "superpowers:systematic-debugging", reason: "Node/NPM 环境问题：系统化定位版本/路径/权限" };
  } else if (taskType === "js-modules") {
    primary = { skill: "superpowers:brainstorming", reason: "模块系统差异：先对齐概念与边界" };
  }

  // candidate (no <skill> tag)
  let candidate = null;

  if (isExecutePlan && primary.skill !== "superpowers:executing-plans") {
    candidate = { skill: "superpowers:executing-plans", reason: "需要按计划推进：执行框架" };
  } else if (isImplement && primary.skill !== "superpowers:test-driven-development") {
    candidate = { skill: "superpowers:test-driven-development", reason: "需要实现/改动：建议走 TDD 闭环" };
  } else if (isPR && primary.skill !== "create-pr") {
    candidate = { skill: "create-pr", reason: "包含 PR 收尾：按项目 create-pr 规范处理" };
  } else if (isPR && primary.skill === "create-pr") {
    candidate = { skill: "superpowers:finishing-a-development-branch", reason: "PR 后收尾：测试/清理/合并 checklist" };
  } else if (isVerify && primary.skill !== "superpowers:verification-before-completion") {
    candidate = { skill: "superpowers:verification-before-completion", reason: "需要确认：完成前验证" };
  }

  return { primary, candidate };
}

// ---------------------- FULL workflow state machine ----------------------
const PHASES = {
  BRAINSTORMING: "BRAINSTORMING",
  WORKTREES: "WORKTREES",
  PLANNING: "PLANNING",
  EXECUTING: "EXECUTING",
  IMPLEMENTING_TDD: "IMPLEMENTING_TDD",
  CODE_REVIEW: "CODE_REVIEW",
  FINISHING: "FINISHING",
  DONE: "DONE",
};

function readState() {
  const s = readJsonFileSafe(stateFile, null);
  if (!s || typeof s !== "object") return null;
  return s;
}

function initFullState(sessionId) {
  return {
    mode: "FULL",
    phase: PHASES.BRAINSTORMING,
    pending_review: false,
    session_id: sessionId || null,
    workflow_id: `wf_${Date.now()}`,
    updated_at: new Date().toISOString(),
  };
}

// User-driven phase hints (Stop hook can also drive phase changes)
function updateFullPhaseByUser(state, userInput, cfg) {
  const t = normalize(userInput);

  if (cfg._re.modeOverrides.reset.test(t)) {
    state.mode = "NONE";
    state.phase = PHASES.DONE;
    state.pending_review = false;
    return state;
  }

  // Hard rule: if pending_review, stay in CODE_REVIEW no matter what user asks
  if (state.pending_review) {
    state.phase = PHASES.CODE_REVIEW;
    return state;
  }

  // Allow manual moves by keywords (kept conservative)
  if (state.phase === PHASES.BRAINSTORMING && /(批准|通过|ok|okay|同意|go ahead|approved)/i.test(t)) {
    state.phase = PHASES.WORKTREES;
  } else if (state.phase === PHASES.WORKTREES && /(worktree.*(完成|就绪)|baseline.*(pass|ok)|环境.*(就绪|完成)|setup.*done)/i.test(t)) {
    state.phase = PHASES.PLANNING;
  } else if (state.phase === PHASES.PLANNING && /(计划.*(确认|批准|通过)|按计划执行|开始执行|execute plan|follow plan)/i.test(t)) {
    state.phase = PHASES.EXECUTING;
  } else if (state.phase === PHASES.EXECUTING && /(开始(实现|开发|写代码)|进入实现|implement|start coding)/i.test(t)) {
    state.phase = PHASES.IMPLEMENTING_TDD;
  } else if (state.phase === PHASES.IMPLEMENTING_TDD && /(写完|实现完成|tests?\s*(pass|passed)|准备review|code review)/i.test(t)) {
    state.phase = PHASES.CODE_REVIEW;
  } else if (state.phase === PHASES.CODE_REVIEW && /(review.*(通过|ok)|继续下一个|next task|继续执行)/i.test(t)) {
    state.phase = PHASES.EXECUTING;
  } else if (
    (state.phase === PHASES.EXECUTING || state.phase === PHASES.IMPLEMENTING_TDD || state.phase === PHASES.CODE_REVIEW) &&
    /(准备(合并|提交|发\s*PR)|ready to merge|create pr|pull request|收尾|结束任务)/i.test(t)
  ) {
    state.phase = PHASES.FINISHING;
  }

  return state;
}

function chooseExecutionSkill(userInput) {
  if (/(批次|batch|checkpoint|阶段确认)/i.test(userInput)) return "superpowers:executing-plans";
  return "superpowers:subagent-driven-development";
}

function nextSkillForPhase(state, userInput) {
  switch (state.phase) {
    case PHASES.BRAINSTORMING:
      return "superpowers:brainstorming";
    case PHASES.WORKTREES:
      return "superpowers:using-git-worktrees";
    case PHASES.PLANNING:
      return "superpowers:writing-plans";
    case PHASES.EXECUTING:
      return chooseExecutionSkill(userInput);
    case PHASES.IMPLEMENTING_TDD:
      return "superpowers:test-driven-development";
    case PHASES.CODE_REVIEW:
      return "superpowers:requesting-code-review";
    case PHASES.FINISHING:
      return "superpowers:finishing-a-development-branch";
    default:
      return "superpowers:brainstorming";
  }
}

// ---------------------- Context builder ----------------------
function buildAdditionalContext(baseInstructions, routingHint, selected, cfg) {
  const lines = [];
  if (baseInstructions) lines.push(baseInstructions);

  lines.push(
    [
      "[ROUTING_HINT]",
      `mode=${routingHint.mode}`,
      `task_type=${routingHint.taskType}`,
      `devScore=${routingHint.devScore}`,
      `thresholds_full=${cfg.thresholds.full}`,
      `thresholds_light=${cfg.thresholds.light}`,
      "[/ROUTING_HINT]",
    ].join("\n")
  );

  if (selected.mode === "FULL") {
    lines.push(
      [
        "FULL WORKFLOW (MANDATORY, sequential):",
        `- workflow_id=${selected.workflow_id}`,
        `- phase=${selected.phase}`,
        `- pending_review=${selected.pending_review ? "true" : "false"}`,
        "",
        "Invoke exactly ONE skill NOW (no batching, no multiple skills in one turn):",
        `<skill>${selected.nextSkill}</skill>`,
        "",
        "FULL-mode instrumentation (required):",
        "- At the very end of your assistant reply, output a WF_REPORT block so Stop Hook can advance phases:",
        "  [WF_REPORT]",
        "  events=DESIGN_APPROVED|WORKTREE_READY|PLAN_APPROVED|TASK_DONE|REVIEW_DONE|READY_TO_FINISH|FINISHED",
        "  notes=<optional short note>",
        "  [/WF_REPORT]",
        "",
        "Hard rule:",
        "- If pending_review=true, you MUST complete CODE_REVIEW before any next task.",
      ].join("\n")
    );
  } else if (selected.mode === "LIGHT") {
    const { primary, candidate } = selected;
    const maxCandidates = cfg.lightRouting?.maxCandidates ?? 2;

    const parts = [];
    parts.push("LIGHT ROUTING (advisory):");
    parts.push(`- primary: ${primary.skill} — ${primary.reason}`);
    parts.push(`  <skill>${primary.skill}</skill>`);

    if (candidate && maxCandidates >= 2) {
      parts.push(`- candidate: ${candidate.skill} — ${candidate.reason}`);
      parts.push("  (candidate is a hint only; do NOT auto-load unless clearly needed)");
    }

    parts.push("");
    parts.push("Note: LIGHT/NONE do not prohibit skill usage; model may still invoke any relevant skill.");
    lines.push(parts.join("\n"));
  } else {
    lines.push(
      [
        "NONE ROUTING:",
        "- No mandatory workflow injected by hook.",
        "- Model may still invoke skills if relevant.",
      ].join("\n")
    );
  }

  return lines.join("\n\n");
}

function outputJson(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

// ---------------------- Main ----------------------
let stdinData = "";
process.stdin.on("data", (chunk) => (stdinData += chunk));
process.stdin.on("end", () => {
  const cfg = loadConfig();
  const baseInstructions = safeReadBaseInstructions();

  const inputData = stdinData.trim() ? safeJsonParse(stdinData, {}) : {};
  const sessionId = inputData.session_id || null;

  let userInput =
    inputData.prompt ||
    inputData.user_input ||
    inputData.message ||
    (typeof inputData === "string" ? inputData : "");

  if (!userInput) {
    for (let i = 2; i < process.argv.length; i++) {
      if (process.argv[i] && !process.argv[i].startsWith("-")) {
        userInput = process.argv[i];
        break;
      }
    }
  }

  userInput = String(userInput || "");
  const normalizedInput = normalize(userInput);

  // Slash command: do not interfere
  if (isSlashCommand(normalizedInput)) {
    return outputJson({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "" },
      systemMessage: "",
    });
  }

  const devScore = computeDevScore(normalizedInput, cfg);
  const taskType = inferTaskType(normalizedInput, cfg);

  const overrideReset = cfg._re.modeOverrides.reset.test(normalizedInput);
  const overrideFull = cfg._re.modeOverrides.full.test(normalizedInput);
  const overrideLight = cfg._re.modeOverrides.light.test(normalizedInput);

  // Decide mode
  let mode = "NONE";

  const isPureQ = cfg._re.patterns.pureQuestionStart.test(normalizedInput);
  const longEnoughForFull = normalizedInput.length >= (cfg.full?.minChars ?? 120);

  if (overrideReset) mode = "NONE";
  else if (overrideFull) mode = "FULL";
  else if (overrideLight) mode = "LIGHT";
  else {
    if (
      devScore.score >= cfg.thresholds.full &&
      (!cfg.full?.requireNotPureQuestionStart || !isPureQ) &&
      longEnoughForFull
    ) {
      mode = "FULL";
    } else if (devScore.score >= cfg.thresholds.light) {
      mode = "LIGHT";
    } else if (taskType !== "other") {
      mode = "LIGHT";
    } else {
      mode = "NONE";
    }
  }

  // Prepare selection
  let state = null;
  let selected = { mode };

  if (mode === "FULL") {
    state = readState();
    if (!state || state.mode !== "FULL") state = initFullState(sessionId);

    state.session_id = sessionId || state.session_id || null;
    state.mode = "FULL";

    state = updateFullPhaseByUser(state, normalizedInput, cfg);

    // If user asked reset in-text, drop to NONE
    if (state.mode !== "FULL" || state.phase === PHASES.DONE) {
      state.updated_at = new Date().toISOString();
      writeJsonFileAtomic(stateFile, state);
      mode = "NONE";
      selected = { mode };
    } else {
      const nextSkill = nextSkillForPhase(state, normalizedInput);
      state.updated_at = new Date().toISOString();
      writeJsonFileAtomic(stateFile, state);

      selected = {
        mode: "FULL",
        workflow_id: state.workflow_id,
        phase: state.phase,
        pending_review: !!state.pending_review,
        nextSkill,
      };
    }
  }

  if (mode === "LIGHT") {
    const { primary, candidate } = pickLightPrimaryAndCandidate(normalizedInput, taskType, cfg);
    selected = { mode: "LIGHT", primary, candidate };
  }

  // Log
  const timestamp = new Date().toISOString();
  appendJsonl(logFile, {
    timestamp,
    session_id: sessionId,
    userInputLength: userInput.length,
    taskType,
    devScore,
    mode,
    selected,
  });

  // Enhanced readable log for skill routing analysis
  logSkillRoute(
    timestamp,
    mode,
    { ...devScore, thresholds: cfg.thresholds },
    taskType,
    selected,
    normalizedInput
  );

  const routingHint = {
    mode,
    taskType,
    devScore: devScore.score,
  };

  const additionalContext = buildAdditionalContext(baseInstructions, routingHint, selected, cfg);

  const systemMessage =
    mode === "FULL"
      ? `FULL workflow: phase=${selected.phase}, next=${selected.nextSkill}`
      : mode === "LIGHT"
      ? `LIGHT routing: primary=${selected.primary?.skill || "n/a"}`
      : "";

  return outputJson({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
    systemMessage,
  });
});

// Never crash hard
process.on("uncaughtException", (e) => {
  outputJson({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: "Hook error; proceeding without additional routing context.",
    },
    systemMessage: `Hook error: ${e && e.message ? e.message : "unknown"}`,
  });
});
