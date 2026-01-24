#!/bin/bash
# Session loader wrapper with error logging
# This script runs the session loader and logs any errors

LOG_FILE=".claude/hook-debug.log"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "================================" >> "$PROJECT_ROOT/$LOG_FILE"
echo "Hook triggered: $(date)" >> "$PROJECT_ROOT/$LOG_FILE"
echo "Working directory: $(pwd)" >> "$PROJECT_ROOT/$LOG_FILE"
echo "Project root: $PROJECT_ROOT" >> "$PROJECT_ROOT/$LOG_FILE"

# Change to project root
cd "$PROJECT_ROOT" || {
    echo "ERROR: Failed to cd to $PROJECT_ROOT" >> "$PROJECT_ROOT/$LOG_FILE"
    exit 1
}

# Run the session loader
echo "Running: npx tsx .claude/session-loader.ts" >> "$PROJECT_ROOT/$LOG_FILE"
npx tsx .claude/session-loader.ts >> "$PROJECT_ROOT/$LOG_FILE" 2>&1
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE" >> "$PROJECT_ROOT/$LOG_FILE"

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: Session loader failed with exit code $EXIT_CODE" >> "$PROJECT_ROOT/$LOG_FILE"
fi

echo "================================" >> "$PROJECT_ROOT/$LOG_FILE"

# Also output to stdout so the result is visible
npx tsx .claude/session-loader.ts

exit $EXIT_CODE
