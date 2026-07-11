// @ts-check
import { defineConfig } from 'astro/config';

// Static output → dist/. URL format "file" reproduces the legacy WordPress
// permalinks exactly: /infos/{slug}.html  (SEO preservation, slugs identical).
export default defineConfig({
  site: 'https://www.fr-business.net',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'auto',
  },
  image: {
    // Featured images are pre-optimized to webp during migration, so we
    // serve them straight from /public and keep builds fast.
    responsiveStyles: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  compressHTML: true,
});
