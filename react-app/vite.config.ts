import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'aws-polly': ['@aws-sdk/client-polly'],
          'aws-translate': ['@aws-sdk/client-translate'],
          'aws-cognito': ['@aws-sdk/client-cognito-identity'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'zustand': ['zustand'],
        },
      },
    },
  },
  // Allow importing tmi.js which uses some Node globals
  define: {
    global: 'globalThis',
  },
});
