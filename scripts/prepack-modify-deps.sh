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

# Check if any dependencies use file: references
HAS_FILE_DEPS=$(node -p "
  const pkg = require('$PACKAGE_JSON');
  const deps = pkg.dependencies || {};
  Object.values(deps).some(v => v.startsWith('file:')) ? 'true' : 'false'
" 2>/dev/null || echo "false")

if [[ "$HAS_FILE_DEPS" == "true" ]]; then
  echo "📦 Preparing for pack/publish: converting file: → version..."
  echo "   Package: $PACKAGE_NAME"

  # Save original and modify all file: dependencies
  node -e "
    const fs = require('fs');
    const path = require('path');
    const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));

    // Save original
    fs.writeFileSync('$PACKAGE_JSON.orig', JSON.stringify(pkg, null, 2) + '\n');

    // Map of package names to their package directory names
    const pkgDirMap = {
      '@net-protocol/core': 'net-core',
      '@net-protocol/storage': 'net-storage',
      '@net-protocol/relay': 'net-relay',
      '@net-protocol/feeds': 'net-feeds',
      '@net-protocol/netr': 'net-netr',
      '@net-protocol/profiles': 'net-profiles',
      '@net-protocol/bazaar': 'net-bazaar',
      '@net-protocol/cli': 'net-cli',
      '@net-protocol/score': 'net-score'
    };

    // Convert all file: dependencies to versioned dependencies
    for (const [depName, depValue] of Object.entries(pkg.dependencies || {})) {
      if (depValue.startsWith('file:')) {
        const dirName = pkgDirMap[depName];
        if (dirName) {
          const depPkgPath = path.join('$ROOT_DIR', 'packages', dirName, 'package.json');
          try {
            const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
            pkg.dependencies[depName] = '^' + depPkg.version;
            console.log('   ' + depName + ': file: → ^' + depPkg.version);
          } catch (e) {
            console.error('   Warning: Could not read version for ' + depName);
          }
        }
      }
    }

    fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
  "

  echo "✅ Temporarily updated file: dependencies to versions"
  echo "   Original saved to package.json.orig"
else
  echo "   No file: dependencies found (skipping)"
fi

