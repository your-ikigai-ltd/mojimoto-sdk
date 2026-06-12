---
"@mojimoto/react": patch
---

Ship the package with a `"use client"` directive. It is entirely React
components, hooks and context, so importing it into a Server Component (Next.js
App Router) threw `createContext is not a function`. The directive is prepended
to the built JS via a tsup `onSuccess` hook (tsup's `banner` plus treeshake drop
a bare directive statement). Consumers no longer need a local client-boundary
wrapper. For server-side rich text, import `asText`/`asHTML` from
`@mojimoto/richtext` directly.
