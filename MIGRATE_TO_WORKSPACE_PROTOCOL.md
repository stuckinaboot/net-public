# Migration Plan: Switch from `file:` to `workspace:*` Protocol

## Overview

Migrate `net-storage` package dependency on `net-core` from `file:../net-core` to `workspace:*` to enable proper npm publishing and align with documented workspace pattern.

## Current State

- **net-storage/package.json** uses: `"@net-protocol/core": "file:../net-core"`
- **Documentation** specifies: `"@net-protocol/core": "workspace:*"`
- **Issue**: `file:` works locally but breaks npm publishing (npm cannot resolve `file:` paths)

## Why This Change?

1. **Publishing Requirement**: When `net-storage` is published to npm, it cannot have `file:../net-core` as a dependency - npm won't resolve it
2. **Documentation Alignment**: Docs already specify `workspace:*` but implementation doesn't match
3. **Yarn Workspace Best Practice**: `workspace:*` is the correct protocol for workspace dependencies
4. **Automatic Resolution**: Yarn automatically replaces `workspace:*` with the actual version from `net-core/package.json` during `yarn npm publish`

## Migration Steps

### Step 1: Update package.json

**File**: `packages/net-storage/package.json`

**Change**: Line 31
```json
// Before:
"@net-protocol/core": "file:../net-core",

// After:
"@net-protocol/core": "workspace:*",
```

### Step 2: Clean and Reinstall Dependencies

```bash
cd /Users/developer/Documents/personal/net-public
yarn install
```

This will:
- Update `yarn.lock` to reflect `workspace:*` protocol
- Recreate symlinks properly
- Ensure workspace resolution works correctly

### Step 3: Verify Local Development Still Works

```bash
# Build both packages
yarn build

# Run tests
yarn test

# Verify type checking
cd packages/net-storage
yarn typecheck
```

### Step 4: Verify Publishing Will Work

**Important**: Yarn 4 replaces `workspace:*` with the actual version during `yarn npm publish`, not during `npm pack`. 

To verify the setup is correct:

```bash
cd packages/net-storage
# Check current dependency (should be workspace:* after migration)
cat package.json | grep "@net-protocol/core"
# Should show: "@net-protocol/core": "workspace:*"

# Verify net-core version exists (this is what workspace:* will resolve to)
cat ../net-core/package.json | grep '"version"'
# Should show: "version": "1.0.0" (or current version)
```

**Note**: When you run `npm pack`, the packed `package.json` will still show `workspace:*` - this is expected and correct. Yarn automatically replaces `workspace:*` with the actual version from `net-core/package.json` **during `yarn npm publish`**, not during pack. The published package on npm will have the correct version (e.g., `"@net-protocol/core": "^1.0.0"`).

To test packing (optional verification):
```bash
cd packages/net-storage
npm pack
tar -xzf net-protocol-storage-*.tgz
cat package/package.json | grep -A 1 "@net-protocol/core"
# Will show: "@net-protocol/core": "workspace:*" (this is expected)
# Yarn replaces it during "yarn npm publish", not during pack.
rm -rf package net-protocol-storage-*.tgz
```

### Step 5: Verify yarn.lock

Check that `yarn.lock` reflects the change:

```bash
grep -A 5 "@net-protocol/core" yarn.lock
```

Should show `workspace:*` resolution, not `file:`.

## Verification Checklist

- [ ] `packages/net-storage/package.json` updated to `workspace:*`
- [ ] `yarn install` completes without errors
- [ ] `yarn build` succeeds for both packages
- [ ] `yarn test` passes for both packages
- [ ] `yarn typecheck` passes for net-storage
- [ ] `npm pack` creates package successfully (workspace:* will be replaced during `yarn npm publish`)
- [ ] `yarn.lock` reflects `workspace:*` protocol

## Expected Behavior After Migration

### Local Development
- `workspace:*` creates symlinks automatically via Yarn workspaces
- Changes to `net-core` are immediately available to `net-storage`
- No difference in developer experience

### Publishing
- **Use `yarn npm publish`** (not `npm publish`) to ensure Yarn handles workspace protocol replacement
- When running `yarn npm publish` on `net-storage`, Yarn automatically replaces `workspace:*` with the version from `net-core/package.json`
- Published package will have: `"@net-protocol/core": "^1.0.0"` (or whatever version is in net-core/package.json)
- npm can resolve the dependency correctly

**Note**: If using `npm publish` directly, workspace protocol replacement may not work. Always use `yarn npm publish` for workspace packages.

## Rollback Plan

If issues arise, revert the change:

1. Change `packages/net-storage/package.json` back to `"file:../net-core"`
2. Run `yarn install`
3. Verify builds and tests still work

## Notes

- **No breaking changes**: This is purely a dependency resolution change
- **No code changes needed**: Only `package.json` needs updating
- **Yarn 4 compatibility**: `workspace:*` is fully supported in Yarn 4.0.0
- **Net repo unaffected**: Net repo will continue using `file:` paths (different workspace, correct approach)

## Related Files

- `packages/net-storage/package.json` - Main change
- `yarn.lock` - Will be updated automatically
- `docs/repo-structure.md` - Already documents `workspace:*` (line 574)

## Success Criteria

Migration is successful when:
1. ✅ Local development works identically
2. ✅ Tests pass
3. ✅ `npm pack` creates package successfully (workspace:* replacement happens during `yarn npm publish`)
4. ✅ Ready for npm publishing

