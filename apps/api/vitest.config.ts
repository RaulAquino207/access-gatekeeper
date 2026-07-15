import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage',
    },
  },
  plugins: [
    // Replaces Vite's default esbuild transform for .ts files. esbuild cannot
    // emit decorator metadata (design:paramtypes), which Nest DI and
    // ValidationPipe depend on at runtime; SWC can. Keep this in sync with
    // the decorator options in tsconfig.json.
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
});
