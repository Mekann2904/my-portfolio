// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

// Markdown/MDX 関連プラグイン
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';

export default defineConfig({
  integrations: [
    react(),      // React 統合
    tailwind(),   // Tailwind CSS 統合
    mdx()         // MDX 統合
  ],
  markdown: {
    // remark プラグイン (Markdown AST -> Markdown AST)
    remarkPlugins: [
      remarkMath    // 数式構文 ($$, $) を認識
    ],
    // rehype プラグイン (HTML AST -> HTML AST)
    rehypePlugins: [
      [rehypeKatex, {
        throwOnError: false,
        errorColor: '#cc0000',
      }],
      rehypeMermaid
    ],
    // コードハイライト設定
    shikiConfig: {
      theme: 'github-dark'
    }
  },
  vite: {
    build: {
      cssMinify: 'esbuild',
      minify: true,
    },
    optimizeDeps: {
      include: ['three']
    },
    ssr: {
      noExternal: ['three']
    }
  }
});