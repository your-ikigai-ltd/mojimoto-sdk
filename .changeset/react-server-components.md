---
'@mojimoto/react': patch
---

`MojiRichText`, `MojiLink` and the other render components now work in React Server Components. Loading the package no longer calls `createContext`, which React's server build doesn't have, so Next.js App Router pages stop failing with "createContext is not a function". On the server, components use their props; `MojimotoProvider` and the hooks still need a client component.
