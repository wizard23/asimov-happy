#!/usr/bin/env bash
set -euo pipefail

# Copies all Codex session JSONL files to a destination directory
# while preserving the original directory structure (year/month/day/...)
#
# Usage:
#   ./codex-sessions-copy.sh <destination-dir>
#
# Example:
#   ./codex-sessions-copy.sh docs/transcripts-buffer/codex

SRC_DIR="${CODEX_SESSIONS_DIR:-$HOME/.codex/sessions}"

if [ "$#" -ne 1 ]; then
  echo "Usage: $(basename "$0") <destination-dir>"
  exit 1
fi

DEST_DIR="$1"

if [ ! -d "$SRC_DIR" ]; then
  echo "Error: Codex sessions directory does not exist: $SRC_DIR"
  exit 1
fi

mkdir -p "$DEST_DIR"

# Use rsync to preserve directory structure and only copy JSONL files
rsync -av \
  --include='*/' \
  --include='*.jsonl' \
  --exclude='*' \
  "$SRC_DIR/" "$DEST_DIR/"

echo "Done. Sessions copied from $SRC_DIR to $DEST_DIR"
