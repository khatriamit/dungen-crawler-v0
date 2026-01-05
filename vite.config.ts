import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@entities': path.resolve(__dirname, './src/game/entities'),
      '@systems': path.resolve(__dirname, './src/game/systems'),
      '@services': path.resolve(__dirname, './src/game/services'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  // 1. ADD THIS PLUGINS SECTION
  plugins: [
    {
      name: 'fix-windows-mime-types',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.ts')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
});