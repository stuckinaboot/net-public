/**
 * Client exports
 * 
 * Only StorageClient is exported here. Internal config builders are not part
 * of the public API and should only be used by StorageClient.
 * 
 * Public functions from xmlStorage (MAX_XML_DEPTH, CONCURRENT_XML_FETCHES, 
 * resolveXmlRecursive) are exported from the main package index.ts.
 */
export { StorageClient } from "./StorageClient";

