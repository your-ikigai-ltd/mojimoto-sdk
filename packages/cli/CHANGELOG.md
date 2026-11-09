# @mojimoto/cli

## 0.2.0

### Minor Changes

- 22d5724: New `mojimoto init` command sets up Claude Code, Cursor and Codex for your project: a Mojimoto skill with your content model, a CLAUDE.md/AGENTS.md note, and the project's MCP server in `.mcp.json` and `.cursor/mcp.json`. Tokens stay in your environment, never in the repo.

### Patch Changes

- 7aa814b: Support for blocks fields. `@mojimoto/client` exports `MojimotoBlock` (`{ id, type, data }`) and `MojimotoSlice`. `<SliceZone>` renders blocks as well as referenced entries: pass `BlockComponents` to type the block components. Existing slice zones are unchanged. The agent skill written by `mojimoto init` now uses the MCP server's real tool names, points agents at the `mojimoto://content-model` resource, and recommends blocks for page sections.

## 0.1.1

### Patch Changes

- 5039210: Packages now declare their repository, which npm needs to verify publish provenance.
