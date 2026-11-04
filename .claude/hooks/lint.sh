#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit): lints the edited file with
# ESLint --fix. Remaining problems are reported back to Claude (exit code 2) so
# they get fixed in the same turn. Prettier is not run: much of the codebase is
# not Prettier-formatted and whole-file reformatting would bloat diffs.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  "$root"/src/*|"$root"/tests/*) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

cd "$root" || exit 0
# Node may come from nvm, which non-interactive shells do not load.
if ! command -v node >/dev/null && [ -d "$HOME/.nvm/versions/node" ]; then
  nvm_bin=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -n 1)
  [ -n "$nvm_bin" ] && PATH="$nvm_bin:$PATH"
fi
[ -x node_modules/.bin/eslint ] && command -v node >/dev/null || exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx)
    if ! out=$("$root/node_modules/.bin/eslint" --fix --max-warnings 0 "$file" 2>&1); then
      echo "ESLint found problems in $file:" >&2
      echo "$out" | tail -n 30 >&2
      exit 2
    fi
    ;;
esac
exit 0
