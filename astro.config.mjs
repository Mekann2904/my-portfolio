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
    mdx()         // MDX 統合 (プラグインは markdown 設定に移動)
  ],
  markdown: {
    // remark プラグイン (Markdown AST -> Markdown AST)
    remarkPlugins: [
      remarkMath,    // 数式構文 ($$, $) を認識
      // remarkMermaid を削除し、代わりにクライアントサイドで直接mermaidを初期化
    ],
    // rehype プラグイン (HTML AST -> HTML AST)
    rehypePlugins: [
      [rehypeKatex, { // 数式を KaTeX でレンダリング
        // KaTeX のオプション (必要に応じて)
        // displayMode: true, // display math をデフォルトにするか？ (通常は不要)
        throwOnError: false, // エラー時にビルドを止めない
        errorColor: '#cc0000', // エラー時のテキスト色
      }],
      // 他の rehype プラグイン (例: slug, autolink-headings) を
      // 必要に応じて追加・順序調整
      // rehypeSlug,
      // [rehypeAutolinkHeadings, { behavior: 'wrap' }],
    ],
    // コードハイライト設定
    shikiConfig: {
      theme: 'github-dark',
      // Mermaid コードブロックは Shiki でハイライトしないようにする
      // (remark-mermaidjs が処理するため)
      // Astro v3.1 以降、言語エイリアスが使えるはず
      // langs: [], // 必要ならカスタマイズ
      // wrap: true, // 必要なら
    },
    // MDX 固有の remark/rehype プラグインは mdx() のオプションに書くことも可能
  },
  vite: {
    build: {
      cssMinify: 'esbuild',
      minify: true, // デフォルトで有効な場合が多いが明示的に設定
    }
  }
});