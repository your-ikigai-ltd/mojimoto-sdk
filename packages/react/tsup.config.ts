import { defineConfig } from 'tsup';
import { readFile, writeFile } from 'node:fs/promises';

const DIRECTIVE = '"use client";\n';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['react', 'react-dom', '@mojimoto/client', '@mojimoto/richtext'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  // The whole package is React components, hooks and context — prepend a
  // "use client" directive to the built JS so it works as a client boundary in
  // RSC frameworks (Next.js App Router) without consumers wrapping it. Done as a
  // post-build step because tsup's `banner` / esbuild treeshake drop a bare
  // directive. For server-side rich text (asText/asHTML), import from
  // @mojimoto/richtext directly.
  async onSuccess() {
    for (const file of ['dist/index.js', 'dist/index.cjs']) {
      const code = await readFile(file, 'utf8');
      if (!code.startsWith(DIRECTIVE)) {
        await writeFile(file, DIRECTIVE + code);
      }
    }
  },
});
