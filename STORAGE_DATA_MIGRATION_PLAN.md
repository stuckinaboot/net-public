# StorageData Migration Plan: Tuple to Object Format

## Overview

This plan documents the migration from tuple format `[string, string]` to object format `{ text: string, value: string }` for `StorageData` type and all related hooks/clients. This change will:

1. Improve type safety and developer experience
2. Eliminate union return types in `useXmlStorage`
3. Provide clearer, more maintainable code
4. Ensure consistency across all storage hooks

## Migration Strategy

### Phase 1: Type Definition Changes (net-public)

### Phase 2: Hook Implementation Changes (net-public)

### Phase 3: Client Implementation Changes (net-public)

### Phase 4: Test Updates (net-public)

### Phase 5: Net Repo Usage Updates

### Phase 6: Verification & Testing

---

## Phase 1: Type Definition Changes

### File: `net-public/packages/net-storage/src/types.ts`

**Change 1.1: Update StorageData type definition**

- **Location**: Line 4
- **Before**:
  ```typescript
  export type StorageData = [string, string];
  ```
- **After**:
  ```typescript
  export type StorageData = {
    text: string;
    value: string;
  };
  ```

**Change 1.2: Remove returnFormat from UseXmlStorageOptions**

- **Location**: Lines 67-79
- **Before**:
  ```typescript
  export type UseXmlStorageOptions = {
    ...
    returnFormat?: "object" | "tuple";
    outputFormat?: "hex" | "string";
  };
  ```
- **After**:
  ```typescript
  export type UseXmlStorageOptions = {
    ...
    outputFormat?: "hex" | "string"; // Remove returnFormat
  };
  ```

**Verification**: TypeScript compilation should pass, no type errors

---

## Phase 2: Hook Implementation Changes

### File: `net-public/packages/net-storage/src/hooks/useStorage.ts`

**Change 2.1: Update formatData helper function**

- **Location**: Lines 32-37
- **Before**:
  ```typescript
  const formatData = (text: string, dataHex: `0x${string}`): StorageData => {
    if (outputAsString) {
      return [text, hexToString(dataHex)];
    }
    return [text, dataHex];
  };
  ```
- **After**:
  ```typescript
  const formatData = (text: string, dataHex: `0x${string}`): StorageData => {
    return {
      text,
      value: outputAsString ? hexToString(dataHex) : dataHex,
    };
  };
  ```

**Change 2.2: Update tuple access in formattedDirectData**

- **Location**: Line 268
- **Before**:
  ```typescript
  const formattedDirectData = latestData
    ? formatData(
        (latestData as StorageData)[0],
        (latestData as StorageData)[1] as `0x${string}`
      )
    : undefined;
  ```
- **After**:
  ```typescript
  const formattedDirectData = latestData
    ? formatData(
        (latestData as StorageData).text,
        (latestData as StorageData).value as `0x${string}`
      )
    : undefined;
  ```

**Verification**: Hook should return object format, all tests pass

---

### File: `net-public/packages/net-storage/src/hooks/useStorageFromRouter.ts`

**Change 2.3: Update tuple construction**

- **Location**: Line 95
- **Before**:
  ```typescript
  setAssembledData([text, hexData]);
  ```
- **After**:
  ```typescript
  setAssembledData({ text, value: hexData });
  ```

**Verification**: Hook should return object format

---

### File: `net-public/packages/net-storage/src/hooks/useXmlStorage.ts`

**Change 2.4: Remove returnFormat parameter and returnAsTuple logic**

- **Location**: Lines 20-26
- **Before**:
  ```typescript
  returnFormat = "object",
  outputFormat = "hex",
  }: UseXmlStorageOptions) {
  const isPreviewMode = !!content;
  const returnAsTuple = returnFormat === "tuple";
  const outputAsString = outputFormat === "string";
  ```
- **After**:
  ```typescript
  outputFormat = "hex",
  }: UseXmlStorageOptions) {
  const isPreviewMode = !!content;
  const outputAsString = outputFormat === "string";
  ```

**Change 2.5: Update metadata access (text/value)**

- **Location**: Lines 48-50
- **Before**:
  ```typescript
  if (!metadata?.[1]) return "";
  return metadata[1] as string;
  ```
- **After**:
  ```typescript
  if (!metadata?.value) return "";
  return metadata.value as string;
  ```

**Change 2.6: Remove tuple format return block (lines 121-203)**

- **Location**: Lines 121-203 (entire block)
- **Action**: DELETE entire `if (returnAsTuple)` block
- **Reason**: Always return object format now

**Change 2.7: Update object format return - skipXmlParsing case**

- **Location**: Lines 207-214 (after removing tuple block, this becomes lines ~123-130)
- **Before**:
  ```typescript
  if (skipXmlParsing) {
    return {
      data: isPreviewMode ? content || "" : ((metadata?.[1] || "") as string),
      filename: metadata?.[0] || "",
      isLoading: metadataLoading,
      error: metadataError,
      isXml: false,
    };
  }
  ```
- **After**:
  ```typescript
  if (skipXmlParsing) {
    return {
      text: metadata?.text || "",
      value: isPreviewMode ? content || "" : metadata?.value || "",
      isLoading: metadataLoading,
      error: metadataError,
      isXml: false,
    };
  }
  ```

**Change 2.8: Update object format return - main case**

- **Location**: Lines 217-227 (after removing tuple block, this becomes lines ~133-143)
- **Before**:
  ```typescript
  return {
    data: isXml
      ? assembledData
      : isPreviewMode
      ? content || ""
      : ((metadata?.[1] || "") as string),
    filename: metadata?.[0] || "",
    isLoading: metadataLoading || (isXml && chunksLoading),
    error: metadataError || chunksError,
    isXml,
  };
  ```
- **After**:
  ```typescript
  return {
    text: metadata?.text || "",
    value: isXml
      ? assembledData || ""
      : isPreviewMode
      ? content || ""
      : metadata?.value || "",
    isLoading: metadataLoading || (isXml && chunksLoading),
    error: metadataError || chunksError,
    isXml,
  };
  ```

**Verification**: Hook should always return `{ text, value, isLoading, error, isXml }` format

---

## Phase 3: Client Implementation Changes

### File: `net-public/packages/net-storage/src/client/StorageClient.ts`

**Change 3.1: Update get() method return**

- **Location**: Lines 79-80
- **Before**:
  ```typescript
  const result = await readContract(this.client, config);
  return result as StorageData;
  ```
- **After**:
  ```typescript
  const result = (await readContract(this.client, config)) as [string, string];
  const [text, value] = result;
  return { text, value };
  ```

**Change 3.2: Update getValueAtIndex() method return**

- **Location**: Lines 104-105
- **Before**:
  ```typescript
  const result = await readContract(this.client, config);
  return result as StorageData;
  ```
- **After**:
  ```typescript
  const result = (await readContract(this.client, config)) as [string, string];
  const [text, value] = result;
  return { text, value };
  ```

**Change 3.3: Update getForOperatorAndKey() method return**

- **Location**: Lines 364-365
- **Before**:
  ```typescript
  return result as StorageData;
  ```
- **After**:
  ```typescript
  const [text, value] = result as [string, string];
  return { text, value };
  ```

**Change 3.4: Update readStorageData() method - historical version path**

- **Location**: Lines 418-419
- **Before**:
  ```typescript
  [text, data] = result;
  data = hexToString(data as `0x${string}`);
  ```
- **After**:
  ```typescript
  const resultObj = result as StorageData;
  text = resultObj.text;
  data = hexToString(resultObj.value as `0x${string}`);
  ```

**Change 3.5: Update readStorageData() method - router path**

- **Location**: Lines 432-434
- **Before**:
  ```typescript
  isChunkedStorage = result.isChunkedStorage;
  text = result.text;
  data = result.data;
  ```
- **After**: No change needed (already object format)

**Verification**: All client methods return object format

---

## Phase 4: Test Updates

### File: `net-public/packages/net-storage/src/__tests__/StorageClient.test.ts`

**Change 4.1: Update get() test assertions**

- **Location**: Lines 59-60
- **Before**:
  ```typescript
  expect(typeof result[0]).toBe("string"); // text
  expect(typeof result[1]).toBe("string"); // data
  ```
- **After**:
  ```typescript
  expect(typeof result.text).toBe("string");
  expect(typeof result.value).toBe("string");
  ```

**Change 4.2: Update getValueAtIndex() test assertions**

- **Location**: Lines 115-116
- **Before**:
  ```typescript
  expect(typeof result[0]).toBe("string");
  expect(typeof result[1]).toBe("string");
  ```
- **After**:
  ```typescript
  expect(typeof result.text).toBe("string");
  expect(typeof result.value).toBe("string");
  ```

**Verification**: All tests pass

---

## Phase 5: Net Repo Usage Updates

### File: `Net/website/src/app/app/profile/[chainIdString]/[userAddress]/page.tsx`

**Change 5.1: Update overviewData access**

- **Location**: Line 71
- **Before**:
  ```typescript
  const hasOverviewContent = overviewData?.[1] && overviewData[1] !== "0x";
  ```
- **After**:
  ```typescript
  const hasOverviewContent = overviewData?.value && overviewData.value !== "0x";
  ```

**Verification**: Profile page displays correctly

---

### File: `Net/website/src/app/app/profile/[chainIdString]/[userAddress]/settings/canvas/page.tsx`

**Change 5.2: Update storageResult access**

- **Location**: Line 65
- **Before**:
  ```typescript
  const storageResultData = storageResult?.[1];
  ```
- **After**:
  ```typescript
  const storageResultData = storageResult?.value;
  ```

**Verification**: Canvas editor loads existing data correctly

---

### File: `Net/website/src/app/app/storage/[chainIdString]/[operatorAddress]/[storageRawStringKey]/page.tsx`

**Change 5.3: Update storageResult usage**

- **Location**: Line 57
- **Before**:
  ```typescript
  storageContents={storageResult || ""}
  ```
- **After**:
  ```typescript
  storageContents={storageResult?.value || ""}
  ```

**Verification**: Storage page displays content correctly

---

### File: `Net/website/src/components/core/net-apps/storage/StoragePage.tsx`

**Change 5.4: Update useXmlStorage destructuring**

- **Location**: Lines 73-76
- **Before**:
  ```typescript
  const {
    data: storageResult,
    filename: storedFilename,
    isLoading,
  } = useXmlStorage({...});
  ```
- **After**:
  ```typescript
  const {
    text: storedFilename,
    value: storageResult,
    isLoading,
  } = useXmlStorage({...});
  ```

**Change 5.5: Update storageResultData assignment**

- **Location**: Line 84
- **Before**:
  ```typescript
  const storageResultData = storageResult;
  ```
- **After**: No change needed (storageResult is now the value directly)

**Change 5.6: Update previewData usage**

- **Location**: Line 87
- **Before**:
  ```typescript
  const { data: previewData, isLoading: previewLoading } = useXmlStorage({...});
  ```
- **After**:
  ```typescript
  const { value: previewData, isLoading: previewLoading } = useXmlStorage({...});
  ```

**Change 5.7: Update dataStr and txtStr assignments**

- **Location**: Lines 102-104
- **Before**:
  ```typescript
  const dataStr = storageResultData || "";
  const txtStr = storedFilename || "";
  ```
- **After**: No change needed (already correct)

**Verification**: Storage page edit mode works correctly

---

### File: `Net/website/src/components/core/net-apps/storage/GenericStorageDisplay.tsx`

**Change 5.8: Update routerData access for XML detection**

- **Location**: Lines 64-65
- **Before**:
  ```typescript
  if (!routerData?.[1]) return false;
  const metadata = hexToString(routerData[1] as `0x${string}`);
  ```
- **After**:
  ```typescript
  if (!routerData?.value) return false;
  const metadata = hexToString(routerData.value as `0x${string}`);
  ```

**Change 5.9: Update tuple construction for XML data**

- **Location**: Lines 82-85
- **Before**:
  ```typescript
  const data = useMemo(() => {
    if (isXmlStorage && xmlData && routerData) {
      // xmlData is a string, need to construct tuple format [filename, content]
      return [routerData[0] || "", stringToHex(xmlData)] as [string, string];
    }
    return routerData;
  }, [isXmlStorage, xmlData, routerData]);
  ```
- **After**:
  ```typescript
  const data = useMemo(() => {
    if (isXmlStorage && xmlData && routerData) {
      // xmlData is a string, need to construct object format
      return { text: routerData.text || "", value: stringToHex(xmlData) };
    }
    return routerData;
  }, [isXmlStorage, xmlData, routerData]);
  ```

**Change 5.10: Update text display**

- **Location**: Line 94
- **Before**:
  ```typescript
  : routerData?.[0]
  ```
- **After**:
  ```typescript
  : routerData?.text
  ```

**Verification**: GenericStorageDisplay handles all storage types correctly

---

### File: `Net/website/src/app/app/token/[chainIdString]/[tokenAddress]/canvas/edit/page.tsx`

**Change 5.11: Update storageResult access**

- **Location**: Line 68
- **Before**:
  ```typescript
  const storageResultData = storageResult?.[1];
  ```
- **After**:
  ```typescript
  const storageResultData = storageResult?.value;
  ```

**Verification**: Token canvas editor loads existing data correctly

---

### File: `Net/website/src/components/core/net-apps/canvas/CanvasDisplay.tsx`

**Change 5.12: Update canvasData access**

- **Location**: Line 24
- **Before**:
  ```typescript
  const hasContent = canvasData?.[1] && canvasData[1] !== "0x";
  ```
- **After**:
  ```typescript
  const hasContent = canvasData?.value && canvasData.value !== "0x";
  ```

**Change 5.13: Update canvasData usage in DisplayableStoredValue**

- **Location**: Line 88
- **Before**:
  ```typescript
  storageContents={canvasData?.[1]}
  ```
- **After**:
  ```typescript
  storageContents={canvasData?.value}
  ```

**Verification**: Canvas display works correctly

---

### File: `Net/website/src/app/app/storage/[chainIdString]/[operatorAddress]/[storageRawStringKey]/raw/page.tsx`

**Change 5.14: Update routerData access**

- **Location**: Line 55
- **Before**:
  ```typescript
  const rawText = routerData?.[1] || "";
  ```
- **After**:
  ```typescript
  const rawText = routerData?.value || "";
  ```

**Verification**: Raw storage page displays correctly

---

### File: `Net/website/src/components/hooks/net/useProfileCanvasFromRouter.ts`

**Change 5.15: Remove returnFormat parameter**

- **Location**: Lines 23-24
- **Before**:
  ```typescript
  returnFormat: "tuple",
  outputFormat: "hex", // Default, but explicit for clarity
  ```
- **After**:
  ```typescript
  outputFormat: "hex", // Default, but explicit for clarity
  ```

**Verification**: Profile canvas hook returns object format

---

### File: `Net/website/src/components/hooks/net/useTokenCanvasFromRouter.ts`

**Change 5.16: Remove returnFormat parameter**

- **Location**: Lines 26-27
- **Before**:
  ```typescript
  returnFormat: "tuple",
  outputFormat: "hex", // Default, but explicit for clarity
  ```
- **After**:
  ```typescript
  outputFormat: "hex", // Default, but explicit for clarity
  ```

**Verification**: Token canvas hook returns object format

---

## Phase 6: Verification & Testing

### Verification Checklist

1. **TypeScript Compilation**

   - [ ] `net-public` packages compile without errors
   - [ ] `Net` repo compiles without errors
   - [ ] No type errors in IDE

2. **Unit Tests**

   - [ ] All `net-public` tests pass
   - [ ] StorageClient tests pass
   - [ ] Hook tests pass (if any)

3. **Integration Testing**

   - [ ] Profile canvas loads correctly
   - [ ] Token canvas loads correctly
   - [ ] Storage page displays correctly
   - [ ] Storage edit mode works correctly
   - [ ] GenericStorageDisplay handles all storage types
   - [ ] Raw storage page works correctly
   - [ ] Canvas display component works correctly

4. **Regression Testing**

   - [ ] No console errors in browser
   - [ ] All storage operations work (read/write)
   - [ ] XML storage resolution works
   - [ ] Chunked storage works
   - [ ] Historical version access works
   - [ ] StorageRouter integration works

5. **Code Review**
   - [ ] All tuple accesses `[0]`, `[1]` removed
   - [ ] All `returnFormat` parameters removed
   - [ ] Consistent object format usage throughout
   - [ ] No `as any` type assertions introduced

### Testing Commands

```bash
# Test net-public packages
cd net-public
yarn test

# Type check
yarn typecheck

# Build packages
yarn build

# Test Net repo
cd ../Net/website
yarn typecheck
yarn build
```

---

## Migration Order

1. **Phase 1**: Type definitions (foundation)
2. **Phase 2**: Hook implementations (core logic)
3. **Phase 3**: Client implementations (API layer)
4. **Phase 4**: Test updates (ensure tests pass)
5. **Phase 5**: Net repo usage (consumer updates)
6. **Phase 6**: Verification (end-to-end testing)

---

## Rollback Plan

If issues arise:

1. Revert Phase 5 changes (Net repo)
2. Revert Phases 1-4 changes (net-public)
3. Restore original tuple format

**Git Strategy**: Create a feature branch for this migration to enable easy rollback.

---

## Notes

- All tuple accesses `[0]` and `[1]` must be replaced with `.text` and `.value`
- Contract calls still return `[string, string]` tuples - convert immediately to object format
- The `outputFormat` parameter remains (controls hex vs string for `value` field)
- `isXml` flag is now always included in `useXmlStorage` return (convenience)
- This is a breaking change for any external consumers of `StorageData` type

---

## Additional Files to Review

### Files that access contract tuples directly (NO CHANGES NEEDED):

These files access raw contract return values `[string, string]` or `[number, string]` directly from contract calls. These are NOT StorageData type, so no changes needed:

**net-public:**

- `packages/net-storage/src/client/xmlStorage.ts` - Lines 46, 108, 139, 265: Accesses contract results `(result as any)[1]` and `(metadata as [number, string])[0]` - These are raw contract tuples, NOT StorageData ✅

**Net repo:**

- `website/src/components/core/net-apps/storage/hooks/useStoragePageData.ts` - Line 45: Accesses router result `(routerResult as [boolean, string, string])[0]` - This is a router contract tuple, NOT StorageData ✅
- `website/src/app/api/[chainId]/storage/utils.ts` - Lines 103, 107, 282-283: Accesses contract metadata tuples `(metadata as [number, string])` - These are raw contract tuples, NOT StorageData ✅
- `website/src/components/core/net-apps/xml-storage/reading.ts` - Accesses contract results directly - NOT StorageData ✅
- `website/src/components/core/net-apps/xml-storage/chunked-backend.ts` - Accesses contract metadata tuples - NOT StorageData ✅

**Important**: Contract calls return tuples `[string, string]` or `[number, string]`. These should be converted to StorageData object format immediately after the contract call. The files above are accessing raw contract results, which is fine - they're not using the StorageData type.

---

## Files Summary

### net-public (8 files - confirmed)

1. `packages/net-storage/src/types.ts` ✅
2. `packages/net-storage/src/hooks/useStorage.ts` ✅
3. `packages/net-storage/src/hooks/useStorageFromRouter.ts` ✅
4. `packages/net-storage/src/hooks/useXmlStorage.ts` ✅
5. `packages/net-storage/src/client/StorageClient.ts` ✅
6. `packages/net-storage/src/__tests__/StorageClient.test.ts` ✅
7. `packages/net-storage/src/index.ts` (verify exports - no changes needed) ✅
8. `packages/net-storage/src/client/xmlStorage.ts` (verify - may need updates)

### Net repo (10 files - confirmed)

1. `website/src/app/app/profile/[chainIdString]/[userAddress]/page.tsx` ✅
2. `website/src/app/app/profile/[chainIdString]/[userAddress]/settings/canvas/page.tsx` ✅
3. `website/src/app/app/storage/[chainIdString]/[operatorAddress]/[storageRawStringKey]/page.tsx` ✅
4. `website/src/components/core/net-apps/storage/StoragePage.tsx` ✅
5. `website/src/components/core/net-apps/storage/GenericStorageDisplay.tsx` ✅
6. `website/src/app/app/token/[chainIdString]/[tokenAddress]/canvas/edit/page.tsx` ✅
7. `website/src/components/core/net-apps/canvas/CanvasDisplay.tsx` ✅
8. `website/src/app/app/storage/[chainIdString]/[operatorAddress]/[storageRawStringKey]/raw/page.tsx` ✅
9. `website/src/components/hooks/net/useProfileCanvasFromRouter.ts` ✅
10. `website/src/components/hooks/net/useTokenCanvasFromRouter.ts` ✅

**Total: 18 files to modify (all confirmed)**

---

## Critical Patterns to Replace

### Pattern 1: Tuple Type Definition

```typescript
// ❌ BEFORE
export type StorageData = [string, string];

// ✅ AFTER
export type StorageData = { text: string; value: string };
```

### Pattern 2: Tuple Construction

```typescript
// ❌ BEFORE
const data: StorageData = [text, value];

// ✅ AFTER
const data: StorageData = { text, value };
```

### Pattern 3: Tuple Access

```typescript
// ❌ BEFORE
const text = data[0];
const value = data[1];

// ✅ AFTER
const text = data.text;
const value = data.value;
```

### Pattern 4: Contract Result Conversion

```typescript
// ❌ BEFORE
const result = await readContract(...) as StorageData;

// ✅ AFTER
const contractResult = await readContract(...) as [string, string];
const [text, value] = contractResult;
const result: StorageData = { text, value };
```

### Pattern 5: Hook Return Format

```typescript
// ❌ BEFORE (useXmlStorage)
const { data, filename } = useXmlStorage({...});
// data: string, filename: string

// ✅ AFTER
const { text, value, isXml } = useXmlStorage({...});
// text: string, value: string, isXml: boolean
```

### Pattern 6: Remove returnFormat Parameter

```typescript
// ❌ BEFORE
useXmlStorage({
  ...,
  returnFormat: "tuple",
  outputFormat: "hex",
})

// ✅ AFTER
useXmlStorage({
  ...,
  outputFormat: "hex", // returnFormat removed
})
```

---

## Pre-Migration Checklist

- [ ] Create feature branch: `git checkout -b migrate-storage-data-to-object`
- [ ] Ensure all tests pass: `yarn test` in net-public
- [ ] Ensure Net repo builds: `yarn build` in Net/website
- [ ] Document current behavior (this plan)
- [ ] Backup current state (git commit)

---

## Post-Migration Checklist

- [ ] All TypeScript compilation passes
- [ ] All tests pass in net-public
- [ ] Net repo builds successfully
- [ ] Manual testing of all affected pages:
  - [ ] Profile canvas page
  - [ ] Token canvas page
  - [ ] Storage page (view mode)
  - [ ] Storage page (edit mode)
  - [ ] Raw storage page
  - [ ] GenericStorageDisplay component
- [ ] No console errors in browser
- [ ] All storage operations work (read/write)
- [ ] XML storage resolution works
- [ ] Chunked storage works
- [ ] Historical version access works
- [ ] StorageRouter integration works

---

## Risk Assessment

**Low Risk:**

- Type definition changes (compile-time only)
- Test updates (straightforward)
- Hook implementation changes (well-defined)

**Medium Risk:**

- Client method changes (need careful contract result conversion)
- Net repo usage updates (many files, need thorough testing)

**Mitigation:**

- Comprehensive plan with all code sites identified
- Phased approach allows incremental verification
- Feature branch enables easy rollback
- Extensive testing checklist

---

## Success Criteria

✅ Zero TypeScript compilation errors  
✅ Zero test failures  
✅ Zero runtime errors  
✅ All storage functionality works as before  
✅ Improved developer experience (clearer API)  
✅ Consistent return format across all hooks
