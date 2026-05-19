// @ts-nocheck
// Codebase RAG - ana public API
export { buildIndex, type CodebaseIndex, type CodeChunk, getIndexStats, loadCachedIndex } from "./indexer.js";
export { formatSearchResults, type SearchResult, searchIndex, searchProject } from "./search.js";
