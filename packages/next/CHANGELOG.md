# @mojimoto/next

## 0.1.3

### Patch Changes

- d9705e6: `@mojimoto/next/preview` no longer evaluates `@mojimoto/react` at module load, so `createPreviewHandler` / `createExitPreviewHandler` can be used in route handlers without a "createContext is not a function" build error. `createSlicePreviewPage` imports it on demand.

## 0.1.2

### Patch Changes

- Updated dependencies [72c1ccb]
- Updated dependencies [307f26d]
  - @mojimoto/client@0.4.0
  - @mojimoto/react@0.2.0
