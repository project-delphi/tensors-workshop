#!/usr/bin/env python3
"""PreToolUse/Bash hook: deny `git commit` while HEAD is a protected branch.

Mirrors .githooks/pre-commit, but fires before the command runs so the refusal
arrives as a permission denial rather than a failed commit.

Reads the hook payload on stdin, writes a deny decision to stdout, and always
exits 0 — a non-zero exit here would surface as a hook error, not a denial.
"""

import json
import os
import re
import shlex
import subprocess
import sys

PROTECTED = {"main"}

# Global git options that consume the *following* token as their value. The
# `--opt=value` spellings are self-contained and need no entry here.
VALUE_OPTS = {
    "-C",
    "-c",
    "--config-env",
    "--exec-path",
    "--git-dir",
    "--namespace",
    "--super-prefix",
    "--work-tree",
}

ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
SEPARATORS = {"&&", "||", "|", "&", ";", ";;", "(", ")", "\n"}


def segments(command):
    """Split a command line into segments, respecting quotes.

    punctuation_chars makes shlex emit `&&`, `||`, `;` and friends as their own
    tokens instead of gluing them onto words, so quoted text containing a
    separator stays intact.
    """
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
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


def commit_repo(tokens):
    """If this segment is a `git commit`, return its target dir (`-C`), else None.

    Returns "" when the segment commits into the ambient repo.
    """
    index = 0
    # Leading VAR=value assignments belong to the command, not to git. They are
    # skipped rather than honored: ALLOW_MAIN_COMMIT is an escape hatch for a
    # human at a terminal, and the agent must not self-authorize a bypass.
    while index < len(tokens) and ASSIGNMENT.match(tokens[index]):
        index += 1

    # `git` must be the command itself, not a word appearing anywhere later.
    if index >= len(tokens) or os.path.basename(tokens[index]) != "git":
        return None
    index += 1

    target = ""
    while index < len(tokens):
        token = tokens[index]
        if token in VALUE_OPTS:
            if token == "-C" and index + 1 < len(tokens):
                # Repeated -C are cumulative; join handles absolute paths.
                target = os.path.join(target, tokens[index + 1])
            index += 2
            continue
        if token.startswith("-"):
            index += 1
            continue
        break

    if index >= len(tokens) or tokens[index] != "commit":
        return None
    return target


def current_branch(path):
    try:
        result = subprocess.run(
            ["git", "-C", path, "symbolic-ref", "--quiet", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return result.stdout.strip() if result.returncode == 0 else None


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
        # Unbalanced quotes: the shell will not run this either.
        return

    base = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    for tokens in parsed:
        target = commit_repo(tokens)
        if target is None:
            continue
        branch = current_branch(os.path.join(base, target) if target else base)
        if branch in PROTECTED:
            json.dump(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": (
                            f"This repo does not take direct commits on {branch}. "
                            "Create a branch (git switch -c <name>), commit there, "
                            "and open a PR. The same rule is enforced by "
                            ".githooks/pre-commit."
                        ),
                    }
                },
                sys.stdout,
            )
            return


if __name__ == "__main__":
    main()
