#!/usr/bin/env node
/**
 * UserPromptSubmit hook handler
 * Reads and outputs the UserPromptSubmit.md content as JSON
 */

const fs = require('fs');
const path = require('path');

const scriptDir = path.dirname(process.argv[1]);
const markdownFile = path.join(scriptDir, 'UserPromptSubmit.md');

try {
  const content = fs.readFileSync(markdownFile, 'utf-8');

  // Extract instructions section (after ## Instructions, until next ## at start of line)
  // Use negative lookahead to avoid matching ### or ####
  const instructionsMatch = content.match(/## Instructions\s*\n([\s\S]+?)(?=^##\s|\Z)/m);
  const instructions = instructionsMatch ? instructionsMatch[1].trim() : content;

  // Output as JSON for hook system
  const output = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: instructions
    }
  };

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error(JSON.stringify({ systemMessage: `Hook error: ${error.message}` }));
  process.exit(0);
}
