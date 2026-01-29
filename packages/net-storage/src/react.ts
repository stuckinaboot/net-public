// React Hooks - requires wagmi and react peer dependencies
export { useStorage } from "./hooks/useStorage";
export { useStorageForOperator } from "./hooks/useStorage";
export { useStorageForOperatorAndKey } from "./hooks/useStorage";
export { useBulkStorage } from "./hooks/useStorage";
export { useStorageTotalWrites } from "./hooks/useStorage";
export { useXmlStorage } from "./hooks/useXmlStorage";
export { useStorageFromRouter } from "./hooks/useStorageFromRouter";

// Re-export types used by hooks
export type { UseStorageOptions, UseXmlStorageOptions } from "./types";
