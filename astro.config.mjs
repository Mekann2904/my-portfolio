// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkExtractUrls from './remark-extract-urls.js';

import playformCompress from '@playform/compress';
import critters from 'astro-critters';

export default defineConfig({
  site: 'https://my-portfolio-f4k.pages.dev',

  prefetch: {
    prefetchAll: true
  },

  integrations: [react(), tailwind(), // playformInlineは外して安定性重視の外部CSS運用に戻す
  mdx({
    remarkPlugins: [
      remarkMath,
      remarkExtractUrls,
    ],
    rehypePlugins: [
      [rehypeKatex, { throwOnError: false, errorColor: '#cc0000' }],
      rehypeSlug,
    ],
  }), playformCompress(), critters()],
  markdown: {
    shikiConfig: { theme: 'github-dark' },
    rehypePlugins: [rehypeSlug],
  },
  vite: {
    build: {
      cssMinify: 'esbuild',
      minify: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'react';
              if (id.includes('three')) return 'three';
              if (id.includes('d3-')) return 'd3';
              return 'vendor';
            }
          },
        },
      },
    },
    optimizeDeps: { 
      include: ['three'],
      exclude: ['lil-gui']
    },
    ssr: { noExternal: ['three'] },
  },
});