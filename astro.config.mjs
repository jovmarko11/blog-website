// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // keep in sync with site.url in src/config/site.ts
  site: 'https://jovmarko11.github.io',
  integrations: [mdx()],
});