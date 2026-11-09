# @mojimoto/vue

## 0.3.2

### Patch Changes

- Updated dependencies [7aa814b]
  - @mojimoto/client@0.5.0

## 0.3.1

### Patch Changes

- 5039210: Packages now declare their repository, which npm needs to verify publish provenance.
- Updated dependencies [5039210]
  - @mojimoto/client@0.4.1
  - @mojimoto/richtext@0.2.1

## 0.3.0

### Minor Changes

- 307f26d: Add a `table` rich-text block (`{ type: "table", rows: [{ cells: [{ text, spans, header? }] }] }`). `serialize` gains `table` / `tableRow` / `tableCell` serializer entries; `asHTML`, `asText`, and the React and Vue renderers render it out of the box (leading all-header rows become `<thead>`).

  `asHTML` now renders a `\n` inside a text run as `<br>`, matching the editor, which stores soft line breaks that way.

### Patch Changes

- Updated dependencies [72c1ccb]
- Updated dependencies [307f26d]
  - @mojimoto/client@0.4.0
  - @mojimoto/richtext@0.2.0
