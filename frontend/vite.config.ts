import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
// Import the package.json to get the version
import { readFileSync } from 'fs';

// Get package.json version
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

// For runtime configuration, we'll always use relative paths
// BASE_PATH will be determined at runtime
const basePath = '';

// OpenTelemetry 환경변수 설정 (Frontend용)
const getOTelConfig = () => {
  return {
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME || 'mcp-hub-frontend',
    OTEL_SERVICE_VERSION: process.env.OTEL_SERVICE_VERSION || packageJson.version,
    OTEL_SERVICE_NAMESPACE: process.env.OTEL_SERVICE_NAMESPACE || 'mcphub',
    OTEL_TRACES_ENABLED: process.env.OTEL_TRACES_ENABLED || 'true',
    OTEL_METRICS_ENABLED: process.env.OTEL_METRICS_ENABLED || 'true',
    OTEL_LOGS_ENABLED: process.env.OTEL_LOGS_ENABLED || 'true',
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    OTEL_TRACES_SAMPLE_RATE: process.env.OTEL_TRACES_SAMPLE_RATE || '1.0',
    OTEL_CONSOLE_ENABLED: process.env.OTEL_CONSOLE_ENABLED || 'true',
    NODE_ENV: process.env.NODE_ENV || 'development',
    OTEL_CORS_URLS: process.env.OTEL_CORS_URLS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Always use relative paths for runtime configuration
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Make package version available as global variable
    // BASE_PATH will be loaded at runtime
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
    // OpenTelemetry Frontend 환경변수 (VITE_ 접두사 필요)
    'import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT': JSON.stringify(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'),
    'import.meta.env.VITE_OTEL_SERVICE_NAME': JSON.stringify(process.env.OTEL_SERVICE_NAME || 'mcp-hub-frontend'),
    'import.meta.env.VITE_OTEL_SERVICE_VERSION': JSON.stringify(process.env.OTEL_SERVICE_VERSION || packageJson.version),
  },
  build: {
    sourcemap: true, // Enable source maps for production build
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    proxy: {
      [`${basePath}/api`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      [`${basePath}/auth`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      [`${basePath}/config`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      [`${basePath}/public-config`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
