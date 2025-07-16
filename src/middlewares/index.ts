import express, { Request, Response, NextFunction } from 'express';
import { auth } from './auth.js';
import { initializeDefaultUser } from '../models/User.js';
import config from '../config/index.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export const initMiddlewares = (app: express.Application): void => {
  // CORS 설정 (OpenTelemetry 헤더 포함)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      // OpenTelemetry 헤더 추가
      'traceparent',
      'tracestate',
      'baggage'
    ].join(', '));
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', [
      'traceparent',
      'tracestate',
      'baggage'
    ].join(', '));
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });

  // Serve static files from the dynamically determined frontend path
  // Note: Static files will be handled by the server directly, not here

  app.use((req, res, next) => {
    const basePath = config.basePath;
    // Only apply JSON parsing for API and auth routes, not for SSE or message endpoints
    // TODO exclude sse responses by mcp endpoint
    if (
      req.path !== `${basePath}/sse` &&
      !req.path.startsWith(`${basePath}/sse/`) &&
      req.path !== `${basePath}/messages`
    ) {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  // Initialize default admin user if no users exist
  initializeDefaultUser().catch((err) => {
    console.error('Error initializing default user:', err);
  });

  // Protect API routes with authentication middleware, but exclude auth endpoints
  app.use(`${config.basePath}/api`, (req, res, next) => {
    // Skip authentication for login and register endpoints
    if (req.path === '/auth/login' || req.path === '/auth/register') {
      next();
    } else {
      auth(req, res, next);
    }
  });

  app.use(errorHandler);
};
