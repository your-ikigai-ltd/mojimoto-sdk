import { defineConfig } from 'tsup';

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
});
