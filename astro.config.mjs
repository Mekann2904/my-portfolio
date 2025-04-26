// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),      // React 統合
    tailwind(),   // Tailwind CSS 統合
  ],
  // Vite プラグイン設定は不要です
});
