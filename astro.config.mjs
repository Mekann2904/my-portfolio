// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [
    react(),      // React 統合
    tailwind(),   // Tailwind CSS 統合
    mdx({         // MDX 統合
      remarkPlugins: [],
      rehypePlugins: [],
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  // Vite プラグイン設定は不要です
});
