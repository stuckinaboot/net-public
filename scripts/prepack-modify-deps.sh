#!/bin/bash
# Script to temporarily modify package.json dependencies before packing/publishing
# Runs via npm 'prepack' lifecycle hook - modifies package.json temporarily
# Original is saved to package.json.orig and restored by postpublish-restore-deps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STORAGE_PKG="$ROOT_DIR/packages/net-storage/package.json"
CORE_PKG="$ROOT_DIR/packages/net-core/package.json"

# Only run if we're in net-storage directory and it has file: dependency
if [[ ! -f "$STORAGE_PKG" ]]; then
  exit 0  # Not net-storage package, skip
fi

CURRENT_DEP=$(node -p "require('$STORAGE_PKG').dependencies['@net-protocol/core']" 2>/dev/null || echo "")

if [[ "$CURRENT_DEP" == *"file:"* ]]; then
  # Get version from net-core package.json
  CORE_VERSION=$(node -p "require('$CORE_PKG').version")
  
  echo "📦 Preparing for pack/publish: converting file: → version..."
  echo "   Current net-core version: $CORE_VERSION"
  
  # Save original and modify
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$STORAGE_PKG', 'utf8'));
    
    // Save original
    fs.writeFileSync('$STORAGE_PKG.orig', JSON.stringify(pkg, null, 2) + '\n');
    
    // Modify dependency
    pkg.dependencies['@net-protocol/core'] = '^$CORE_VERSION';
    fs.writeFileSync('$STORAGE_PKG', JSON.stringify(pkg, null, 2) + '\n');
  "
  
  echo "✅ Temporarily updated to @net-protocol/core@^$CORE_VERSION"
  echo "   Original saved to package.json.orig"
else
  echo "   Already using version: $CURRENT_DEP (skipping)"
fi

