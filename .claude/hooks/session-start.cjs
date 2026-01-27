#!/usr/bin/env node
/**
 * Claude Code Hook: Session Start - Project Progress Loader
=========================================================
 * This hook runs when a new Claude Code session starts.
 * It loads the current project progress and displays it as context.
 *
 * Configuration in .claude/settings.local.json:
 *
 * {
 *   "hooks": {
 *     "SessionStart": [
 *       {
 *         "type": "command",
 *         "command": "node .claude/hooks/session-start.cjs"
 *       }
 *     ]
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// Try multiple possible plan file names
const planFiles = [
  'CURRENT_EXECUTION_PLAN.md',
  'BTS_EXECUTION_PLAN.md',
  'EXECUTION_PLAN.md'
];
let planFile = planFiles.find(f => fs.existsSync(path.join(projectDir, f)));
if (planFile) planFile = path.join(projectDir, planFile);
const claudeMdFile = path.join(projectDir, 'CLAUDE.md');

/**
 * Parse the execution plan to extract task progress
 * Supports BTS_EXECUTION_PLAN.md format with Task headers and status lines
 */
function parseExecutionPlan(content) {
  const lines = content.split('\n');
  const tasks = [];
  let currentPhase = '';

  for (const line of lines) {
    // Track phase sections (Phase 1, Phase 2, etc.)
    if (line.match(/^##\s+Phase\s+\d+/)) {
      currentPhase = line.replace(/^##\s+/, '').trim();
      continue;
    }

    // Skip status lines (e.g., "- [ ] 状态: 待开始")
    if (line.match(/^\s*-\s*\[[ x]\]\s*状态:/)) {
      continue;
    }

    // Parse task items with Task prefix (e.g., "- [ ] `utg.json` - UTG Open Raising")
    const taskMatch = line.match(/^\s*-\s*\[([ x])\]\s*(.+)$/);
    if (taskMatch) {
      const description = taskMatch[2].trim();
      // Only include tasks that have actual content (not just "状态: xxx")
      if (description && !description.match(/^状态:/)) {
        tasks.push({
          phase: currentPhase,
          description,
          status: taskMatch[1] === 'x' ? 'completed' : 'pending'
        });
      }
    }
  }

  return tasks;
}

/**
 * Calculate progress percentage
 */
function calculateProgress(tasks) {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Format the session summary
 */
function formatSessionSummary(planContent, claudeMdContent) {
  let summary = '';

  // Parse execution plan
  const tasks = parseExecutionPlan(planContent);
  const progress = calculateProgress(tasks);

  // Extract project info from CLAUDE.md
  const projectMatch = claudeMdContent.match(/## Project Overview\s+([\s\S]+?)(?=##|$)/);
  const projectInfo = projectMatch ? projectMatch[1].trim() : 'No project overview available';

  // Extract current status
  const statusMatch = claudeMdContent.match(/## Current Status\s+([\s\S]+?)(?=##|$)/);
  const currentStatus = statusMatch ? statusMatch[1].trim() : '';

  // Build summary
  summary += '\n';
  summary += '╔════════════════════════════════════════════════════════════════╗\n';
  summary += '║                  📁 PROJECT SESSION LOADED                      ║\n';
  summary += '╚════════════════════════════════════════════════════════════════╝\n';
  summary += '\n';
  summary += `📊 Progress: ${progress}% (${tasks.filter(t => t.status === 'completed').length}/${tasks.length} tasks)\n`;
  summary += '\n';
  summary += '📋 Recent Tasks:\n';

  // Show recent pending tasks (up to 5)
  const pendingTasks = tasks.filter(t => t.status === 'pending').slice(0, 5);
  if (pendingTasks.length > 0) {
    pendingTasks.forEach(task => {
      summary += `  ☐ ${task.description}\n`;
    });
  } else {
    summary += '  ✅ All tasks completed!\n';
  }

  summary += '\n';
  summary += '📝 Quick Commands:\n';
  summary += '  npm run dev:server  - Start Express API server\n';
  summary += '  npm run dev:web     - Start React UI dev server\n';
  summary += '  cargo run -p solver - Run Rust solver CLI\n';
  summary += '\n';

  return summary;
}

function main() {
  try {
    let planContent = '';
    let claudeMdContent = '';

    // Read execution plan
    if (fs.existsSync(planFile)) {
      planContent = fs.readFileSync(planFile, 'utf-8');
    }

    // Read CLAUDE.md
    if (fs.existsSync(claudeMdFile)) {
      claudeMdContent = fs.readFileSync(claudeMdFile, 'utf-8');
    }

    // Output session summary
    if (planContent || claudeMdContent) {
      const summary = formatSessionSummary(planContent, claudeMdContent);

      const output = {
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: summary
        },
        systemMessage: ""
      };

      console.log(JSON.stringify(output, null, 2));
    } else {
      // No files found, output empty
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: ""
        },
        systemMessage: ""
      }));
    }
  } catch (error) {
    console.error(JSON.stringify({
      systemMessage: `SessionStart hook error: ${error.message}`,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: ""
      }
    }));
    process.exit(0);
  }
}

main();
