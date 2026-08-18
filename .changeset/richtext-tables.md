---
"@mojimoto/richtext": minor
"@mojimoto/react": minor
"@mojimoto/vue": minor
---

Add a `table` rich-text block (`{ type: "table", rows: [{ cells: [{ text, spans, header? }] }] }`). `serialize` gains `table` / `tableRow` / `tableCell` serializer entries; `asHTML`, `asText`, and the React and Vue renderers render it out of the box (leading all-header rows become `<thead>`).

`asHTML` now renders a `\n` inside a text run as `<br>`, matching the editor, which stores soft line breaks that way.
