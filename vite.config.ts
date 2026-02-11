import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // Vite automatically handles VITE_* variables from .env files.
    // Explicit 'define' is not needed unless non-VITE variables are used.

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },

    // Build optimization
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase': ['@supabase/supabase-js'],
            'charts': ['recharts'],
            'pdf': ['jspdf', 'html2canvas']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },

    // Dev server configuration
    server: {
      port: 5173,
      strictPort: false,
      open: true
    }
  };
});
