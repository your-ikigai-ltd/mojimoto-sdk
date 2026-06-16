# @mojimoto/cli

Command-line tool for the **Mojimoto** headless CMS. Today it does one thing: download the
generated TypeScript types for your project's content model, so your editor gets full
autocomplete against the delivery API.

You don't need to install it — run it on demand with `npx`:

```bash
npx @mojimoto/cli types \
  --endpoint https://mojimoto.com/api/v1 \
  --project decentenergy \
  --token "$MOJIMOTO_TOKEN"
```

This writes `mojimoto.generated.ts` into the current directory.

## Configuration

Each option can be passed as a flag or an environment variable:

| Flag | Env var | Description |
| --- | --- | --- |
| `--endpoint <url>` | `MOJIMOTO_ENDPOINT` | Delivery endpoint. |
| `--project <slug>` | `MOJIMOTO_PROJECT` | Project slug. |
| `--token <token>` | `MOJIMOTO_TOKEN` | A **read** API token. |
| `-o, --output <file>` | — | Output path (default `mojimoto.generated.ts`). |

With the env vars set, the command is just:

```bash
mojimoto types -o types/mojimoto.ts
```

## Use it in your build

Add a script so types regenerate on demand (and optionally before builds):

```jsonc
// package.json
{
  "scripts": {
    "cms:types": "mojimoto types -o types/mojimoto.ts",
    "prebuild": "mojimoto types -o types/mojimoto.ts"
  }
}
```

Then consume the output with the client:

```ts
import { createClient, type MojimotoDocument } from '@mojimoto/client';
import type { MarketingPageData } from './types/mojimoto';

const home = await cms.byUid<MojimotoDocument<'marketing_page', MarketingPageData>>(
  'marketing_page',
  'home',
);
home?.data.headline; // ✅ typed
```

> Commit the generated file, or regenerate it in CI — whichever your team prefers. It only
> changes when your content model changes.

## How it works

The CLI calls `GET {endpoint}/{project}/types` with your read token; the Mojimoto delivery API
returns the TypeScript declarations for that project. No access to the CMS source code is
required — everything comes through the hosted API.

## License

MIT © Your Ikigai Ltd
