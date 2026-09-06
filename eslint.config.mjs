import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Prebuilt static images avoid metered on-demand image transformations.
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores(['.next/**', '.data/**', 'out/**', 'build/**']),
]);
