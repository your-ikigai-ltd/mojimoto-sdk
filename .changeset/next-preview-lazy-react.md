---
"@mojimoto/next": patch
---

`@mojimoto/next/preview` no longer evaluates `@mojimoto/react` at module load, so `createPreviewHandler` / `createExitPreviewHandler` can be used in route handlers without a "createContext is not a function" build error. `createSlicePreviewPage` imports it on demand.
