#!/bin/bash
# git-save.sh — 自动提交并推送所有更改
# 用法: bash scripts/git-save.sh "提交信息"
# 如果不传参，则根据更改内容自动生成结构化中文摘要

set -e

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Not in a git repository"
  exit 1
}

# 检查是否有更改
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit."
  exit 0
fi

# 显示更改概览
echo "=== Changes ==="
git status --short
echo ""

# 生成提交信息
if [ -n "$1" ]; then
  MSG="$1"
else
  # 判断变更类型
  TYPE="更新"
  if grep -q "^A" < <(git diff --cached --name-status) 2>/dev/null; then TYPE="新增功能"; fi
  if grep -q "^D" < <(git diff --cached --name-status) 2>/dev/null; then TYPE="${TYPE}/删除"; fi
  if grep -q "^?" < <(git status --porcelain) 2>/dev/null; then TYPE="新增功能"; fi

  DETAIL=$(git diff --name-status --cached 2>/dev/null | awk '{
    s = "修改"
    if ($1 == "A") s = "新增"
    else if ($1 == "D") s = "删除"
    f = $2
    n = split(f, p, "/")
    base = p[n]
    if (n == 1) printf "  - [%s] %s (%s)\n", "根目录", base, s
    else {
      dir = substr(f, 1, length(f) - length(base) - 1)
      printf "  - [%s] %s (%s)\n", dir, base, s
    }
  }' | sort)

  STATS=$(git diff --stat --cached 2>/dev/null | tail -1)

  MSG="${TYPE}

## 变更内容
${DETAIL}

### 统计
${STATS}"
fi

# 暂存全部
git add --all

# 提交
git commit -m "$MSG"
echo ""

# 推送
if git remote -v | grep -q origin; then
  BRANCH=$(git branch --show-current)
  echo "Pushing to origin/${BRANCH}..."
  git push origin "${BRANCH}"
  echo "Pushed successfully."
else
  echo "No remote configured - skipped push."
fi
