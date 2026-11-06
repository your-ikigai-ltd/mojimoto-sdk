# @mojimoto/react

## 0.2.1

### Patch Changes

- ef3ddf8: `MojiRichText`, `MojiLink` and the other render components now work in React Server Components. Loading the package no longer calls `createContext`, which React's server build doesn't have, so Next.js App Router pages stop failing with "createContext is not a function". On the server, components use their props; `MojimotoProvider` and the hooks still need a client component.

## 0.2.0

### Minor Changes

- 307f26d: Add a `table` rich-text block (`{ type: "table", rows: [{ cells: [{ text, spans, header? }] }] }`). `serialize` gains `table` / `tableRow` / `tableCell` serializer entries; `asHTML`, `asText`, and the React and Vue renderers render it out of the box (leading all-header rows become `<thead>`).

  `asHTML` now renders a `\n` inside a text run as `<br>`, matching the editor, which stores soft line breaks that way.

### Patch Changes

- Updated dependencies [72c1ccb]
- Updated dependencies [307f26d]
  - @mojimoto/client@0.4.0
  - @mojimoto/richtext@0.2.0
