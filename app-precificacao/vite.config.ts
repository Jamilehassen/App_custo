import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    // Data e hora do build, para mostrar a versão no app.
  define: {
    __DATA_BUILD__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Quando eu publicar uma versão nova, o app se atualiza sozinho.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      workbox: {
        // Deixa o app inteiro (inclusive a parte do PDF) disponível sem internet.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'App de Precificação', // nome completo (troque pelo nome do ateliê)
        short_name: 'Precificação', // nome embaixo do ícone no celular
        description: 'Preços, materiais, produtos e catálogo do meu ateliê.',
        lang: 'pt-BR',
        theme_color: '#e11d48',
        background_color: '#fff1f2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})