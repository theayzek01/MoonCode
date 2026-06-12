import { shouldCompact } from "./packages/cli/src/core/compaction/compaction.ts";
console.log(shouldCompact(190000, 200000, {
  enabled: true,
  profile: 'aggressive',
  reserveTokens: 4096,
  keepRecentTokens: 3000
}));
