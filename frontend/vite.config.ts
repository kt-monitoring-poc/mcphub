import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
// Import the package.json to get the version
import { readFileSync } from 'fs';

// Get package.json version (use root package.json)
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

// For runtime configuration, we'll always use relative paths
// BASE_PATH will be determined at runtime
const basePath = '';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Always use relative paths for runtime configuration
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Make package version available as global variable
    // BASE_PATH will be loaded at runtime
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
  },
  build: {
    sourcemap: true, // Enable source maps for production build
  },
  server: {
    port: 5173, // 프론트엔드 개발 서버 포트 명시
    host: true, // 모든 호스트에서 접근 허용
    allowedHosts: ['all'], // 모든 호스트 허용 (ngrok 포함)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/config': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/login/config': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
