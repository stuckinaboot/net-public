# Plan Updates Needed Based on Net Repo Analysis

## Summary of Findings

After comprehensive analysis of the Net repo, the following updates are needed to the plan:

### 1. Missing React Hooks (CRITICAL)

**Add to hooks section:**
- `useCanvasFromRouter` - Used extensively for profile/token canvas fetching
- `useCanvasFromRouterWithXml` - Same but with XML resolution

**Location:** `Net/website/src/components/hooks/net/useCanvasFromRouter.ts` and `useCanvasFromRouterWithXml.ts`

### 2. Missing Hook Features

**useXmlStorage:**
- Add documentation for preview mode (`content?: string` parameter)
- Document historical version support (`index?: number`)

**useStorageForOperatorAndKey:**
- Already in plan but confirm it's included in exports

### 3. Missing Utilities

**From `chunked-backend.ts`:**
- `fetchXmlChunksFromChunkedStorage` - Already mentioned but needs more detail

**From `writing.ts` (data preparation only):**
- `processDataForStorage` - Chunk data and generate XML metadata
- `chunkData` - Split data into chunks
- `generateXmlMetadata` - Generate XML metadata string
- `validateDataSize` - Validate data size
- `computeTopLevelHash` - Compute top-level hash

**Note:** Do NOT include transaction submission utilities (website-specific)

### 4. Package Structure Updates

**Add to hooks directory:**
- `useCanvasFromRouter.ts`
- `useCanvasFromRouterWithXml.ts`

**Add to utils directory:**
- `writingUtils.ts` (data preparation utilities only)

### 5. Exports Updates

**Add to main exports:**
```typescript
export { useCanvasFromRouter } from "./hooks/useCanvasFromRouter";
export { useCanvasFromRouterWithXml } from "./hooks/useCanvasFromRouterWithXml";
export { processDataForStorage, chunkData, generateXmlMetadata, validateDataSize, computeTopLevelHash } from "./utils/writingUtils";
```

## Regressions Check - All Clear ✅

1. ✅ Historical version handling - Covered
2. ✅ useStorageForOperator Net contract - Uses getNetContract (correct)
3. ✅ XML resolution recursion - Covered
4. ✅ ChunkedStorage assembly - Covered

## Decisions Made

1. ✅ Include `useCanvasFromRouter` hooks - YES (used extensively)
2. ✅ Include `useStorageForOperatorAndKey` - YES (API completeness)
3. ✅ Include writing utilities - YES (data preparation only, no transaction submission)
4. ❌ Exclude MIME type detection - NO (website-specific)
5. ❌ Exclude CDN link generation - NO (website-specific)

