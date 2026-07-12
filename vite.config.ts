import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind only to loopback — prevents accidental exposure on shared networks.
    // Set host: '0.0.0.0' explicitly if remote access is required.
    host: 'localhost',
  },
  preview: {
    port: 4173,
    host: 'localhost',
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'query';
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/recharts')) {
            return 'ui';
          }
        },
      },
    },
  },
});
