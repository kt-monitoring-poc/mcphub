import { Request, Response } from 'express';
import config from '../config/index.js';
import { loadSettings } from '../config/index.js';

/**
 * Get runtime configuration for frontend
 */
export const getRuntimeConfig = (req: Request, res: Response): void => {
  try {
    const runtimeConfig = {
      basePath: config.basePath,
      version: config.mcpHubVersion,
      name: config.mcpHubName,
    };

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      data: runtimeConfig,
    });
  } catch (error) {
    console.error('Error getting runtime config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get runtime configuration',
    });
  }
};

/**
 * Get OpenTelemetry configuration for frontend
 */
export const getOTelConfig = (req: Request, res: Response): void => {
  try {
    // 불린 값 파싱 함수
    const parseBoolean = (value: string | undefined): boolean => {
      return value === 'true' || value === '1';
    };

    const otelConfig = {
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://collector-http.rnr-apps-01.4.217.129.211.nip.io:4318',
      serviceName: process.env.OTEL_SERVICE_NAME || 'mcp-hub-frontend',
      serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
      serviceNamespace: process.env.OTEL_SERVICE_NAMESPACE || 'mcphub',
      tracesEnabled: parseBoolean(process.env.OTEL_TRACES_ENABLED || 'true'),
      metricsEnabled: parseBoolean(process.env.OTEL_METRICS_ENABLED || 'true'),
      logsEnabled: parseBoolean(process.env.OTEL_LOGS_ENABLED || 'true'),
      consoleEnabled: parseBoolean(process.env.OTEL_CONSOLE_ENABLED || 'true') && 
                     (process.env.NODE_ENV || 'development') === 'development',
      sampleRate: parseFloat(process.env.OTEL_TRACES_SAMPLE_RATE || '1.0'),
      environment: process.env.NODE_ENV || 'development',
    };

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      data: otelConfig,
    });
  } catch (error) {
    console.error('Error getting OpenTelemetry config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OpenTelemetry configuration',
    });
  }
};

/**
 * Get public system configuration (only skipAuth setting)
 * This endpoint doesn't require authentication to allow checking if auth should be skipped
 */
export const getPublicConfig = (req: Request, res: Response): void => {
  try {
    const settings = loadSettings();
    const skipAuth = settings.systemConfig?.routing?.skipAuth || false;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      data: {
        skipAuth,
      },
    });
  } catch (error) {
    console.error('Error getting public config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get public configuration',
    });
  }
};
