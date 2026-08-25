import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /* GitHub Pages serves from /<repo>/, so the asset paths need that prefix.
     Everywhere else this stays '/'. */
  base: process.env.VITE_BASE ?? '/',
  server: {
    port: 5173,
    /* The API runs on its own port in development; in production the API
       serves this build, so the same /api paths work either way. */
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true }
    }
  },
  build: { outDir: 'dist', sourcemap: true }
});
