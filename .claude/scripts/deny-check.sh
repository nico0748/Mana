#!/bin/bash
# ============================================================
# deny-check.sh — PreToolUse フック
# --dangerously-skip-permissions 使用時も危険なコマンドをブロックする
# ============================================================

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# Bash 以外はスルー
if [ "$TOOL" != "Bash" ]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# ── Deny パターン一覧 ──────────────────────────────────────
DENY_PATTERNS=(
  "git config --global"
  "brew install"
  "npm install -g"
  "yarn global add"
  "chmod 777"
  "rm -rf /"
  "rm -rf ~"
  "gh repo delete"
  "git push --force"
  "git push -f "
  "git reset --hard HEAD~"
  "sudo rm"
  "sudo chmod"
  "^curl .* \\| bash"
  "^curl .* \\| sh"
  "^wget .* \\| bash"
  "^wget .* \\| sh"
)

# コマンドをセグメントに分割（; && || で区切る）
split_segments() {
  echo "$1" \
    | sed 's/;/\n/g' \
    | sed 's/&&/\n/g' \
    | sed 's/||/\n/g' \
    | while read -r line; do
        echo "$line" | xargs 2>/dev/null || echo "$line"
      done
}

# パターンマッチ（先頭一致 or 部分一致）
matches_any_pattern() {
  local segment="$1"
  for pattern in "${DENY_PATTERNS[@]}"; do
    if echo "$segment" | grep -qE "$pattern" 2>/dev/null; then
      echo "$pattern"
      return 0
    fi
  done
  return 1
}

# 各セグメントをチェック
while IFS= read -r segment; do
  [ -z "$segment" ] && continue
  matched=$(matches_any_pattern "$segment")
  if [ $? -eq 0 ]; then
    echo "🚫 ブロック: deny パターン '$matched' に一致しました" >&2
    echo "   コマンド: $segment" >&2
    exit 2
  fi
done < <(split_segments "$COMMAND")

exit 0
