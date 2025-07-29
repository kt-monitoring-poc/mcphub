import express, { NextFunction, Request, Response } from 'express';
import config from '../config/index.js';
import { initializeDefaultUser } from '../models/User.js';
import { auth } from './auth.js';

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
    // Skip authentication for login, register, OAuth endpoints, health check, groups, market, keys, and auth/me
    if (
      req.path === '/auth/login' ||
      req.path === '/auth/register' ||
      req.path === '/auth/me' ||
      req.path === '/auth/github' ||
      req.path === '/auth/github/callback' ||
      req.path.startsWith('/auth/logout') ||
      req.path === '/health' ||
      req.path === '/groups' ||
      req.path.startsWith('/market') ||
      req.path.startsWith('/keys')
    ) {
      next();
    } else {
      auth(req, res, next);
    }
  });

  app.use(errorHandler);
};
