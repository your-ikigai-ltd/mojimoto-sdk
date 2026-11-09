---
'@mojimoto/client': minor
'@mojimoto/react': minor
'@mojimoto/cli': patch
---

Support for blocks fields. `@mojimoto/client` exports `MojimotoBlock` (`{ id, type, data }`) and `MojimotoSlice`. `<SliceZone>` renders blocks as well as referenced entries: pass `BlockComponents` to type the block components. Existing slice zones are unchanged. The agent skill written by `mojimoto init` now uses the MCP server's real tool names, points agents at the `mojimoto://content-model` resource, and recommends blocks for page sections.
