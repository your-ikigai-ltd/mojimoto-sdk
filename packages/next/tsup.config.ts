import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/preview.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['@mojimoto/client', 'next', 'next/headers', 'next/navigation', 'react'],
});
