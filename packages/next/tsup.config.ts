import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/preview.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: [
    '@mojimoto/client',
    '@mojimoto/react',
    'next',
    'next/headers',
    'next/navigation',
    'react',
    'react/jsx-runtime',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
