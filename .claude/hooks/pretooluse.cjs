#!/usr/bin/env node
/**
 * PreToolUse Hook for Claude Code
 *
 * 在工具执行前检查，阻止危险操作
 * 规则配置: .claude/hooks/lib/rules.json
 */

const fs = require("fs");
const path = require("path");

// Import rule engine
const ruleEngine = require("./lib/rule-engine.cjs");

// Project directory
const projectDir = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, "..", "..");

/**
 * Main entry point
 */
function main() {
  let stdinData = "";

  process.stdin.on("data", (chunk) => {
    stdinData += chunk;
  });

  process.stdin.on("end", () => {
    try {
      const inputData = JSON.parse(stdinData || "{}");

      // Load rules
      const rules = ruleEngine.loadRules(projectDir);

      // Only check blocking rules in PreToolUse
      const blockingRules = rules.filter((r) => r.enabled && r.action === "block");

      // Evaluate rules
      const result = ruleEngine.evaluateRules(blockingRules, {
        ...inputData,
        hook_event_name: "PreToolUse"
      });

      // Output result
      if (result.systemMessage || result.hookSpecificOutput) {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: result.hookSpecificOutput || {
            hookEventName: "PreToolUse"
          },
          systemMessage: result.systemMessage
        }));
      } else {
        process.stdout.write(JSON.stringify({}));
      }

    } catch (e) {
      // On error, allow operation (exit with empty output)
      process.stdout.write(JSON.stringify({}));
    } finally {
      process.exit(0);
    }
  });
}

main();
