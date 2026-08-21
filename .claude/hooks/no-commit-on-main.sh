#!/bin/bash
# PreToolUse/Bash hook: deny `git commit` while HEAD is a protected branch.
#
# Mirrors .githooks/pre-commit, but fires before the command runs so the
# refusal arrives as a permission denial rather than a failed commit.

set -u

protected_branches="main"

payload=$(cat)
command=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')
[ -n "$command" ] || exit 0

# Is any segment of the command line a `git commit`?
is_git_commit() {
	local segment seen_git skip_next tok
	# Split on shell separators; quoted separators are not handled (rare here).
	while IFS= read -r segment; do
		seen_git=0
		skip_next=0
		for tok in $segment; do
			if [ "$skip_next" = 1 ]; then
				skip_next=0
				continue
			fi
			if [ "$seen_git" = 0 ]; then
				case "$tok" in
					git | */git) seen_git=1 ;;
				esac
				continue
			fi
			case "$tok" in
				-C | -c) skip_next=1 ;;   # option with a separate value
				-*) ;;                    # other git options
				commit) return 0 ;;
				*) break ;;               # some other subcommand
			esac
		done
	done <<< "$(printf '%s' "$1" | sed -E 's/(\|\||&&|[;|&])/\n/g')"
	return 1
}

is_git_commit "$command" || exit 0

branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" symbolic-ref --quiet --short HEAD 2>/dev/null) || exit 0

for p in $protected_branches; do
	if [ "$branch" = "$p" ]; then
		jq -n --arg b "$branch" '{
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason:
					"This repo does not take direct commits on \($b). Create a branch (git switch -c <name>), commit there, and open a PR. The same rule is enforced by .githooks/pre-commit."
			}
		}'
		exit 0
	fi
done

exit 0
