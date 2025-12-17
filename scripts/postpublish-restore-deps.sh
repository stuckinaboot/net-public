#!/bin/bash
# Script to restore original package.json after publishing
# Runs via npm 'postpublish' lifecycle hook
# Handles both net-storage and net-feeds packages generically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect which package directory we're in by checking for package.json
# Script should be run from within a package directory (net-storage or net-feeds)
CURRENT_DIR="$(pwd)"
PACKAGE_JSON="$CURRENT_DIR/package.json"
ORIG_PKG="$PACKAGE_JSON.orig"

# Cleanup function - restore on exit if script fails
cleanup() {
  if [[ -f "$ORIG_PKG" ]]; then
    echo "⚠️  Cleaning up: restoring package.json"
    mv "$ORIG_PKG" "$PACKAGE_JSON" 2>/dev/null || true
  fi
}

# Register cleanup on script exit
trap cleanup EXIT

# Only restore if we're in a package directory and backup exists
if [[ ! -f "$PACKAGE_JSON" ]]; then
  exit 0  # Not in a package directory, skip
fi

if [[ -f "$ORIG_PKG" ]]; then
  # Get package name for logging
  PACKAGE_NAME=$(node -p "require('$PACKAGE_JSON').name" 2>/dev/null || echo "package")
  
  echo "🔄 Restoring original package.json..."
  echo "   Package: $PACKAGE_NAME"
  mv "$ORIG_PKG" "$PACKAGE_JSON"
  echo "✅ Restored package.json to use file:../net-core"
else
  echo "   No backup found (package.json.orig), skipping restore"
fi

