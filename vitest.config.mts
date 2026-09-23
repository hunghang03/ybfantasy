import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.tmp.test.ts', 'node_modules/**'],
    environment: 'node',
    coverage: { include: ['src/domain/**', 'src/persistence/**'] },
  },
});
