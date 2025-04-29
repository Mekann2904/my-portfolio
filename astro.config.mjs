// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

// Markdown/MDX 関連プラグイン
import { visit } from 'unist-util-visit';

/** @type {import('unified').Plugin<[], import('mdast').Root>} */
function remarkCustomMath() {
  return (tree) => {
    // ブロック数式 ($$...$$) を処理
    tree.children = tree.children.flatMap((node) => {
      if (node.type === 'code' && node.lang === 'math') {
        return {
          type: 'html',
          value: `<div class="math-block" data-katex-formula="${escapeHtml(node.value)}"></div>`
        };
      }
      return node;
    });

    // インライン数式 ($...$) を処理
    visit(tree, 'inlineCode', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (node.value.startsWith('$') && node.value.endsWith('$')) {
        const formula = node.value.slice(1, -1);
        parent.children[index] = {
          type: 'html',
          value: `<span class="math-inline" data-katex-formula="${escapeHtml(formula)}"></span>`
        };
      }
    });

    /** @param {string} str */
    function escapeHtml(str) {
      return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
    }
  };
}

export default defineConfig({
  integrations: [
    react(),      // React 統合
    tailwind(),   // Tailwind CSS 統合
    mdx()         // MDX 統合 (プラグインは markdown 設定に移動)
  ],
  markdown: {
    // remark プラグイン (Markdown AST -> Markdown AST)
    remarkPlugins: [
      remarkCustomMath,
    ],
    // rehype プラグイン (HTML AST -> HTML AST)
    rehypePlugins: [
      // カスタム数式プラグインを後で追加
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
