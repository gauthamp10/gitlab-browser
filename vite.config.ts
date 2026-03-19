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
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['lucide-react', 'recharts'],
        },
      },
    },
  },
});
