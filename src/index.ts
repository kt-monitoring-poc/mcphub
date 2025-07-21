// OpenTelemetry를 다른 모든 모듈보다 먼저 로드
import './services/telemetry.js';
import 'reflect-metadata';
import AppServer from './server.js';

const appServer = new AppServer();

async function boot() {
  try {
    await appServer.initialize();
    appServer.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

boot();

export default appServer.getApp();
