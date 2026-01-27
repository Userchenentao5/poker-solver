/**
 * Rule Engine for Claude Code Hooks
 * Loads rules from .claude/hooks/rules.json and evaluates them
 */

const fs = require("fs");
const path = require("path");

/**
 * Load rules from JSON config file
 * @param {string} projectDir - Project directory
 * @returns {Array} List of rule objects
 */
function loadRules(projectDir) {
  const rulesPath = path.join(projectDir, ".claude", "hooks", "lib", "rules.json");

  try {
    const content = fs.readFileSync(rulesPath, "utf-8");
    const config = JSON.parse(content);

    // Convert simple pattern to conditions if needed
    for (const rule of config.rules) {
      if (rule.pattern && !rule.conditions) {
        const event = rule.event || "all";
        let field = "content";
        if (event === "bash") field = "command";
        else if (event === "file") field = "new_text";

        rule.conditions = [{ field, operator: "regex_match", pattern: rule.pattern }];
      }
    }

    return config.rules;
  } catch (e) {
    console.warn(`Warning: Failed to load rules from ${rulesPath}: ${e.message}`);
    return [];
  }
}

/**
 * Check if a condition matches
 * @param {object} condition - Condition object
 * @param {string} value - Value to check
 * @returns {boolean}
 */
function checkCondition(condition, value) {
  const { operator, pattern } = condition;

  if (value === null || value === undefined) return false;

  switch (operator) {
    case "regex_match":
      try {
        return new RegExp(pattern, "i").test(value);
      } catch {
        return false;
      }
    case "contains":
      return value.includes(pattern);
    case "not_contains":
      return !value.includes(pattern);
    case "equals":
      return value === pattern;
    case "starts_with":
      return value.startsWith(pattern);
    case "ends_with":
      return value.endsWith(pattern);
    default:
      return false;
  }
}

/**
 * Extract field value from tool input
 * @param {string} field - Field name
 * @param {object} toolInput - Tool input object
 * @returns {string|null}
 */
function extractFieldValue(field, toolInput) {
  // Direct field
  if (field in toolInput) {
    const value = toolInput[field];
    return typeof value === "string" ? value : String(value);
  }

  // Special cases
  if (field === "command") return toolInput.command || "";
  if (field === "file_path") return toolInput.file_path || "";
  if (field === "new_text" || field === "new_string") return toolInput.new_string || toolInput.content || "";
  if (field === "old_text" || field === "old_string") return toolInput.old_string || "";

  // MultiEdit
  if (field === "content" && toolInput.edits) {
    return toolInput.edits.map((e) => e.new_string || "").join(" ");
  }

  return null;
}

/**
 * Evaluate rules against hook input
 * @param {Array} rules - List of rules
 * @param {object} inputData - Hook input data
 * @returns {object} Match result
 */
function evaluateRules(rules, inputData) {
  const toolName = inputData.tool_name || "";
  const toolInput = inputData.tool_input || {};
  const hookEvent = inputData.hook_event_name || "";

  const blocking = [];
  const warnings = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Check event filter
    if (rule.event !== "all") {
      const ruleEvent = rule.event.toLowerCase();
      if (ruleEvent === "bash" && toolName !== "Bash") continue;
      if (ruleEvent === "file" && !["Edit", "Write", "MultiEdit"].includes(toolName)) continue;
      if (ruleEvent === "stop" && hookEvent !== "Stop") continue;
    }

    // Check tool matcher
    if (rule.tool_matcher) {
      const matchers = rule.tool_matcher.split("|");
      if (!matchers.includes("*") && !matchers.includes(toolName)) continue;
    }

    // Check conditions
    let matches = true;
    if (rule.conditions) {
      for (const cond of rule.conditions) {
        const value = extractFieldValue(cond.field, toolInput);
        if (!checkCondition(cond, value)) {
          matches = false;
          break;
        }
      }
    }

    if (!matches) continue;

    // Rule matched
    if (rule.action === "block") {
      blocking.push(rule);
    } else {
      warnings.push(rule);
    }
  }

  // Build result
  if (blocking.length > 0) {
    const messages = blocking.map((r) => `**[${r.name}]**\n${r.message}`);
    const combined = messages.join("\n\n");

    if (hookEvent === "Stop") {
      return { decision: "block", reason: combined, systemMessage: combined };
    } else if (hookEvent === "PreToolUse") {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny"
        },
        systemMessage: combined
      };
    } else {
      return { systemMessage: combined };
    }
  }

  if (warnings.length > 0) {
    const messages = warnings.map((r) => `**[${r.name}]**\n${r.message}`);
    return { systemMessage: messages.join("\n\n") };
  }

  return {};
}

module.exports = {
  loadRules,
  evaluateRules
};
