#!/bin/bash
# Script to temporarily modify package.json dependencies before packing/publishing
# Runs via npm 'prepack' lifecycle hook - modifies package.json temporarily
# Original is saved to package.json.orig and restored by postpublish-restore-deps.sh
# Handles both net-storage and net-feeds packages generically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CORE_PKG="$ROOT_DIR/packages/net-core/package.json"

# Detect which package directory we're in by checking for package.json
# Script should be run from within a package directory (net-storage or net-feeds)
CURRENT_DIR="$(pwd)"
PACKAGE_JSON="$CURRENT_DIR/package.json"

# Only run if we're in a package directory with package.json
if [[ ! -f "$PACKAGE_JSON" ]]; then
  exit 0  # Not in a package directory, skip
fi

# Get package name to identify which package we're in
PACKAGE_NAME=$(node -p "require('$PACKAGE_JSON').name" 2>/dev/null || echo "")

# Only process packages that depend on @net-protocol/core
if [[ -z "$PACKAGE_NAME" ]]; then
  exit 0  # Invalid package.json, skip
fi

CURRENT_DEP=$(node -p "require('$PACKAGE_JSON').dependencies['@net-protocol/core']" 2>/dev/null || echo "")

if [[ "$CURRENT_DEP" == *"file:"* ]]; then
  # Get version from net-core package.json
  CORE_VERSION=$(node -p "require('$CORE_PKG').version")
  
  echo "📦 Preparing for pack/publish: converting file: → version..."
  echo "   Package: $PACKAGE_NAME"
  echo "   Current net-core version: $CORE_VERSION"
  
  # Save original and modify
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
    
    // Save original
    fs.writeFileSync('$PACKAGE_JSON.orig', JSON.stringify(pkg, null, 2) + '\n');
    
    // Modify dependency
    pkg.dependencies['@net-protocol/core'] = '^$CORE_VERSION';
    fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
  "
  
  echo "✅ Temporarily updated to @net-protocol/core@^$CORE_VERSION"
  echo "   Original saved to package.json.orig"
else
  echo "   Already using version: $CURRENT_DEP (skipping)"
fi

