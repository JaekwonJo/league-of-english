#!/usr/bin/env bash
set -euo pipefail

# Push helper that uses an environment variable instead of interactive password.
# Usage:
#   GITHUB_PAT=ghp_xxx bash scripts/push-with-pat.sh [branch]

BRANCH="${1:-main}"
REPO_SLUG="JaekwonJo/league-of-english"
REMOTE_NAME="origin"

if [[ -z "${GITHUB_PAT:-}" ]]; then
  echo "[push-with-pat] Please set GITHUB_PAT environment variable." >&2
  exit 1
fi

ORIGIN_URL=$(git remote get-url "$REMOTE_NAME")
TEMP_URL="https://JaekwonJo:${GITHUB_PAT}@github.com/${REPO_SLUG}.git"

echo "[push-with-pat] pushing ${BRANCH} to ${REPO_SLUG}..."
git remote set-url "$REMOTE_NAME" "$TEMP_URL"
git push "$REMOTE_NAME" "$BRANCH"

# Restore the original URL without token
git remote set-url "$REMOTE_NAME" "$ORIGIN_URL"
echo "[push-with-pat] done. Remote restored to original URL."

