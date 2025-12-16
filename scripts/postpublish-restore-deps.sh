#!/bin/bash
# Script to restore original package.json after publishing
# Runs via npm 'postpublish' lifecycle hook

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STORAGE_PKG="$ROOT_DIR/packages/net-storage/package.json"
ORIG_PKG="$STORAGE_PKG.orig"

# Cleanup function - restore on exit if script fails
cleanup() {
  if [[ -f "$ORIG_PKG" ]]; then
    echo "⚠️  Cleaning up: restoring package.json"
    mv "$ORIG_PKG" "$STORAGE_PKG" 2>/dev/null || true
  fi
}

# Register cleanup on script exit
trap cleanup EXIT

# Only restore if we're in net-storage and backup exists
if [[ -f "$ORIG_PKG" ]]; then
  echo "🔄 Restoring original package.json..."
  mv "$ORIG_PKG" "$STORAGE_PKG"
  echo "✅ Restored package.json to use file:../net-core"
else
  echo "   No backup found (package.json.orig), skipping restore"
fi

