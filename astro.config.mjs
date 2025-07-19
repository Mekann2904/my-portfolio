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
      // チャンクサイズの警告閾値を調整
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // より細かいチャンク分割で未使用コードを削減
          manualChunks: {
            // React関連
            react: ['react', 'react-dom'],
            // Three.js関連（重いので分離）
            three: ['three'],
            threeControls: ['three/examples/jsm/controls/OrbitControls'],
            threeLoaders: ['three/examples/jsm/loaders/OBJLoader'],
            threeObjects: ['three/examples/jsm/objects/Water', 'three/examples/jsm/objects/Sky'],
            threePostprocessing: ['three/examples/jsm/postprocessing/EffectComposer', 'three/examples/jsm/postprocessing/RenderPass', 'three/examples/jsm/postprocessing/UnrealBloomPass'],
            // D3関連
            d3: ['d3-selection', 'd3-force', 'd3-drag', 'd3-zoom'],
            // その他のライブラリ
            tween: ['@tweenjs/tween.js'],
            gsap: ['gsap'],
            // ブログ関連のコンポーネント
            blogUtils: [
              './src/components/Backlinks.jsx',
              './src/components/ExtractLinks.jsx',
              './src/components/DynamicToc.jsx',
              './src/components/BlogGraph.jsx',
              './src/components/BlogCommandPaletteWrapper.jsx',
              './src/components/DownloadBox.jsx'
            ],
            // Three.jsコンポーネント（重いので分離）
            threeComponents: [
              './src/components/ThreeBox.jsx',
              './src/components/ThreeBox-1.jsx',
              './src/components/ThreeBox-2.jsx',
              './src/components/ThreeBox-3.jsx',
              './src/components/ThreeBox-4.jsx',
              './src/components/ThreeBase.jsx',
              './src/components/Harmony.jsx'
            ],
            // React Three Fiber関連
            reactThree: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
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