// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

// Markdown/MDX 関連プラグイン
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkMermaid from 'remark-mermaidjs';

export default defineConfig({
  integrations: [
    react(),      // React 統合
    tailwind(),   // Tailwind CSS 統合
    mdx()         // MDX 統合
  ],
  markdown: {
    // remark プラグイン (Markdown AST -> Markdown AST)
    remarkPlugins: [
      remarkMath,    // 数式構文 ($$, $) を認識
      [remarkMermaid, {
        theme: 'dark',
        securityLevel: 'loose',
        startOnLoad: true
      }]
    ],
    // rehype プラグイン (HTML AST -> HTML AST)
    rehypePlugins: [
      [rehypeKatex, {
        throwOnError: false,
        errorColor: '#cc0000',
      }]
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