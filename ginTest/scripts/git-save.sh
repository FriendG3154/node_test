#!/bin/bash
# git-save.sh — Auto-commit and push all changes
# Usage: bash scripts/git-save.sh "commit message"
# If no message is given, it generates one from changed file list.

set -e

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "❌ Not in a git repository"
  exit 1
}

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
  echo "✓ No changes to commit."
  exit 0
fi

# Show summary
echo "=== Changes ==="
git status --short
echo ""

# Generate commit message
if [ -n "$1" ]; then
  MSG="$1"
else
  FILES=$(git diff --name-only --cached 2>/dev/null | head -5)
  if [ -z "$FILES" ]; then
    FILES=$(git diff --name-only | head -5)
  fi
  MSG="chore: $(echo "$FILES" | tr '\n' ' ' | sed 's/ $//')"
fi

# Stage all
git add --all

# Commit
git commit -m "$MSG"
echo ""

# Push if remote exists
if git remote -v | grep -q origin; then
  BRANCH=$(git branch --show-current)
  echo "Pushing to origin/$BRANCH..."
  git push origin "$BRANCH"
  echo "✓ Pushed successfully."
else
  echo "ℹ No remote configured — skipped push."
  echo "  Set one up: git remote add origin <url>"
fi
