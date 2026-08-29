import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    loadEnv(mode, '.', '');
    return {
      test: {
        environment: 'jsdom',
        globals: true,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['.manus.computer'],
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      css: { postcss: {} },
      build: {
        target: 'esnext',
        cssCodeSplit: true,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-ui': ['lucide-react']
            }
          }
        }
      }
    };
});
