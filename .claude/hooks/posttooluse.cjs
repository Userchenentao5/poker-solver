#!/usr/bin/env node
/**
 * PostToolUse Hook for Claude Code
 *
 * 在工具执行后检查，显示警告信息
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

      // Evaluate all rules (warn and block)
      const result = ruleEngine.evaluateRules(rules, {
        ...inputData,
        hook_event_name: "PostToolUse"
      });

      // Output result
      if (result.systemMessage) {
        process.stdout.write(JSON.stringify({
          systemMessage: result.systemMessage
        }));
      } else {
        process.stdout.write(JSON.stringify({}));
      }

    } catch (e) {
      // On error, silently continue
      process.stdout.write(JSON.stringify({}));
    } finally {
      process.exit(0);
    }
  });
}

main();
