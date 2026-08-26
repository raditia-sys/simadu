import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/simadu/',

  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
              return 'vendor-charts';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            return 'vendor-misc';
          }
        },
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    proxy: {
      // All /api/* requests are proxied to the PHP backend at Laragon
      // This ensures session cookies work correctly (same-origin behaviour)
      //
      // ADJUST the target if your Laragon setup uses a virtual host:
      //   e.g. target: 'http://simadu.test'  → uri: /backend/...
      //
      // Default assumption: Laragon Document Root = D:\Simadu
      //   → http://localhost/backend/... maps to D:\Simadu\backend\...
      '/api': {
        // Laragon AutoVirtualHost: simadu.test → D:\Simadu
        // Proxy: /api/xxx → http://simadu.test/backend/api/xxx
        target: 'http://simadu.test',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/backend/api'),
      },
      '/uploads': {
        target: 'http://simadu.test',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads/, '/backend/uploads'),
      },
    },
  },
});
