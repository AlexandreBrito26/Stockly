import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Stockly - PDV para varejo e moda',
        short_name: 'Stockly',
        description: 'Caixa, estoque e vendas para varejo e moda. Funciona offline.',
        lang: 'pt-BR',
        theme_color: '#1f5f4a',
        background_color: '#f7f7f5',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg}'] },
    }),
  ],
  css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
