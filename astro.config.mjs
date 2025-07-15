// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkMermaid from 'remark-mermaidjs';

export default defineConfig({
  site: 'https://my-portfolio-f4k.pages.dev',

  integrations: [
    react(),
    tailwind(),
    mdx({
      remarkPlugins: [
        remarkMath,
        [remarkMermaid, {
          wrap: {
            tagName: 'div',
            className: 'mermaid-diagram-container'
          },
          theme: 'base',
          themeVariables: {
            primaryColor: '#18181b',
            primaryTextColor: '#f3f4f6',
            primaryBorderColor: '#6366f1',
            lineColor: '#6366f1',
            fontFamily: 'sans-serif',
          }
        }],
      ],
      rehypePlugins: [
        [rehypeKatex, { throwOnError: false, errorColor: '#cc0000' }],
      ],
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
  vite: {
    build: {
      cssMinify: 'esbuild',
      minify: true,
    },
    optimizeDeps: { include: ['three'] },
    ssr: { noExternal: ['three'] },
  },
});