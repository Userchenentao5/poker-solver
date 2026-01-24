#!/usr/bin/env node
/**
 * SessionStart hook handler
 * Reads and outputs the SessionStart.md content as JSON
 */

const fs = require('fs');
const path = require('path');

const scriptDir = path.dirname(process.argv[1]);
const markdownFile = path.join(scriptDir, 'SessionStart.md');

try {
  const content = fs.readFileSync(markdownFile, 'utf-8');

  // Extract instructions section (after ## Instructions)
  const instructionsMatch = content.match(/## Instructions\s*\n([\s\S]+?)(?=##|\Z)/);
  const instructions = instructionsMatch ? instructionsMatch[1].trim() : content;

  // Output as JSON for hook system
  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: instructions
    }
  };

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error(JSON.stringify({ systemMessage: `Hook error: ${error.message}` }));
  process.exit(0);
}
