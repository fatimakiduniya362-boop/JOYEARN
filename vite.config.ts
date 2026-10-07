
import fs from 'fs';

function binaryArtifactsPlugin() {
  return {
    name: 'binary-artifacts-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const rawUrl = req.url?.split('?')[0] || '';
        if (rawUrl.endsWith('.aab') || rawUrl.endsWith('.zip')) {
          const fileName = path.basename(rawUrl);
          const candidates = [
            path.join(process.cwd(), 'public', rawUrl.replace(/^\//, '')),
            path.join(process.cwd(), 'dist', rawUrl.replace(/^\//, '')),
            path.join(process.cwd(), 'public', fileName),
            path.join(process.cwd(), 'dist', fileName),
            path.join(process.cwd(), 'android-release', fileName),
          ];
          for (const cand of candidates) {
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
              const stat = fs.statSync(cand);
              res.setHeader('Content-Type', 'application/octet-stream');
              res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
              res.setHeader('Content-Length', stat.size);
              res.setHeader('Cache-Control', 'no-cache');
              const stream = fs.createReadStream(cand);
              stream.pipe(res);
              return;
            }
          }
        }
        next();
      });
    },
  };
}
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      binaryArtifactsPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          '.well-known/assetlinks.json',
        ],
        manifest: {
          id: '/',
          name: 'JoyEarn: Global Rewards & Learning',
          short_name: 'JoyEarn',
          description: 'Safe, ethical global family rewards and learning app with international USD payouts, quizzes, and educational entertainment worldwide.',
          theme_color: '#f43f5e',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: 'es2020',
      minify: 'esbuild' as const,
      cssMinify: true,
      sourcemap: false, // Obfuscation for Google Play Console release
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/motion/')) {
              return 'vendor-ui';
            }
            if (id.includes('src/data/quizBank') || id.includes('src/data/quizDatabase')) {
              return 'data-quizzes';
            }
            if (id.includes('src/data/videos')) {
              return 'data-videos';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
