#!/usr/bin/env python3
"""PreToolUse/Bash hook: deny commit-creating git commands on a protected branch.

Mirrors .githooks/pre-commit, but fires before the command runs so the refusal
arrives as a permission denial rather than a failed commit.

This layer is a convenience, not the enforcement boundary. Deciding which repo
a shell command will commit into is not decidable in general — `cd`, wrappers,
subshells and command substitution all move the target. .githooks/pre-commit
runs inside git itself, with exact knowledge of the branch, and is what
actually holds the line; this hook exists to fail early and explain why.

Reads the hook payload on stdin, writes a deny decision to stdout, and exits 0
either way — a non-zero exit surfaces as a hook error, not as a denial.
"""

import json
import os
import re
import shlex
import subprocess
import sys

PROTECTED = {"main"}

# Subcommands that write a commit. git runs no pre-commit hook for cherry-pick,
# revert or am, so for those this is the only guard there is.
COMMIT_SUBCOMMANDS = {"commit", "cherry-pick", "revert", "am"}

# Any other subcommand ends the search: whatever follows belongs to it, so a
# later bare `commit` token is an argument (`git log --grep commit`), not a verb.
OTHER_SUBCOMMANDS = {
    "add", "annotate", "apply", "archive", "bisect", "blame", "branch",
    "bundle", "cat-file", "check-ignore", "checkout", "cherry", "clean",
    "clone", "commit-graph", "commit-tree", "config", "count-objects",
    "describe", "diff", "difftool", "fetch", "filter-branch", "for-each-ref",
    "format-patch", "fsck", "gc", "grep", "help", "hook", "init", "log",
    "ls-files", "ls-remote", "ls-tree", "maintenance", "merge", "merge-base",
    "mv", "notes", "pull", "push", "range-diff", "rebase", "reflog", "remote",
    "repack", "replace", "request-pull", "rerere", "reset", "restore",
    "rev-list", "rev-parse", "rm", "shortlog", "show", "show-ref", "sparse-checkout",
    "stash", "status", "submodule", "switch", "symbolic-ref", "tag", "update-index",
    "update-ref", "version", "whatchanged", "worktree",
}

# Global options taking the *following* token as their value. Kept only to
# locate `-C`; the subcommand scan below no longer depends on it being complete.
VALUE_OPTS = {
    "-C", "-c", "--attr-source", "--config-env", "--exec-path", "--git-dir",
    "--namespace", "--super-prefix", "--work-tree",
}

# Words that may precede the real command without changing what it does.
WRAPPERS = {
    "!", "{", "builtin", "command", "do", "elif", "else", "env", "exec",
    "nice", "nohup", "sudo", "then", "time", "xargs",
}

ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
SEPARATORS = {"&&", "||", "|", "&", ";", ";;", "(", ")", "\n"}


def segments(command):
    """Split a command line into segments, respecting quotes."""
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    # bash only starts a comment at a word boundary; shlex would cut `done#now`
    # mid-word and silently swallow the rest of the line.
    lexer.commenters = ""
    segment = []
    for token in lexer:
        if token in SEPARATORS:
            if segment:
                yield segment
            segment = []
        else:
            segment.append(token)
    if segment:
        yield segment


def strip_prefix(tokens):
    """Drop leading env assignments and wrapper words (env, sudo, then, ...)."""
    index = 0
    while index < len(tokens) and (
        ASSIGNMENT.match(tokens[index]) or tokens[index] in WRAPPERS
    ):
        index += 1
    return tokens[index:]


def chdir_target(tokens):
    """If the segment is a `cd <dir>`, return the directory, else None."""
    tokens = strip_prefix(tokens)
    if len(tokens) == 2 and tokens[0] == "cd" and not tokens[1].startswith("-"):
        return tokens[1]
    return None


def commit_repo(tokens):
    """If the segment writes a commit, return its `-C` target, else None.

    Returns "" when the commit lands in the ambient repo.
    """
    tokens = strip_prefix(tokens)
    if not tokens or os.path.basename(tokens[0]) != "git":
        return None

    target = ""
    index = 1
    while index < len(tokens):
        token = tokens[index]
        if token in VALUE_OPTS:
            if token == "-C" and index + 1 < len(tokens):
                # Repeated -C compose; join handles absolute paths correctly.
                target = os.path.join(target, tokens[index + 1])
            index += 2
            continue
        # The first recognized subcommand decides. Scanning for it, rather than
        # taking the first non-option token, means an unknown global option's
        # value (`--attr-source HEAD`) cannot hide the verb behind it.
        if token in COMMIT_SUBCOMMANDS:
            return target
        if token in OTHER_SUBCOMMANDS:
            return None
        index += 1
    return None


def current_branch(path):
    try:
        result = subprocess.run(
            ["git", "-C", path, "symbolic-ref", "--quiet", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return result.stdout.strip() if result.returncode == 0 else None


def deny(branch):
    json.dump({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"This repo does not take direct commits on {branch}. "
                "Create a branch (git switch -c <name>), commit there, and open "
                "a PR. The same rule is enforced by .githooks/pre-commit. "
                "ALLOW_MAIN_COMMIT is not honored here — ask before bypassing."
            ),
        }
    }, sys.stdout)


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return
    command = (payload.get("tool_input") or {}).get("command") or ""
    if not command:
        return

    try:
        parsed = list(segments(command))
    except ValueError:
        return  # unbalanced quotes; the shell will not run this either

    # The Bash tool's cwd persists between calls, so the payload's cwd is a
    # better starting point than the project root when the two differ.
    cwd = payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

    for tokens in parsed:
        moved = chdir_target(tokens)
        if moved is not None:
            cwd = os.path.join(cwd, moved)
            continue
        target = commit_repo(tokens)
        if target is None:
            continue
        branch = current_branch(os.path.join(cwd, target) if target else cwd)
        if branch in PROTECTED:
            deny(branch)
            return


if __name__ == "__main__":
    main()
