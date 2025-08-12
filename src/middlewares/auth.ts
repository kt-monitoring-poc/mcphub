import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loadSettings } from '../config/index.js';
import { MCPHubKeyService } from '../services/mcpHubKeyService.js';
import { DEBUG_MODE, DebugLogger } from '../utils/debugLogger.js';

// Default secret key - in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// MCPHub Key Service instance
const mcpHubKeyService = new MCPHubKeyService();

const validateBearerAuth = (req: Request, routingConfig: any): boolean => {
  if (!routingConfig.enableBearerAuth) {
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  return authHeader.substring(7) === routingConfig.bearerAuthKey;
};

// MCPHub Key 인증 함수
const validateMcpHubKey = async (req: Request): Promise<boolean> => {
  const authHeader = req.headers.authorization;
  const requestId = (req as any).requestId;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const keyValue = authHeader.substring(7);

  if (!keyValue.startsWith('mcphub_')) {
    return false;
  }

  try {
    const authResult = await mcpHubKeyService.authenticateKey(keyValue);

    if (authResult) {
      // 인증된 사용자 정보를 request에 추가
      (req as any).user = authResult.user;
      (req as any).mcpHubKey = authResult.key;
      (req as any).serviceTokens = authResult.serviceTokens;

      if (DEBUG_MODE && requestId) {
        DebugLogger.logAuth(requestId, 'MCPHub Key', {
          userId: authResult.user.id,
          username: authResult.user.username,
          mcphubKey: keyValue,
          serviceTokenCount: Object.keys(authResult.serviceTokens || {}).length
        }, true);
      }

      return true;
    }
  } catch (error) {
    console.error('MCPHub Key 인증 오류:', error);
    if (DEBUG_MODE && requestId) {
      DebugLogger.logAuth(requestId, 'MCPHub Key', { error: error instanceof Error ? error.message : String(error) }, false);
    }
  }

  return false;
};

// Middleware to authenticate JWT token, session, or MCPHub Key
export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if authentication is disabled globally
  const routingConfig = loadSettings().systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
    skipAuth: false,
  };

  if (routingConfig.skipAuth) {
    next();
    return;
  }

  // 1. MCPHub Key 인증 시도
  try {
    if (await validateMcpHubKey(req)) {
      next();
      return;
    }
  } catch (error) {
    console.error('MCPHub Key 인증 오류:', error);
  }

  // 2. Bearer Auth 인증 시도
  if (validateBearerAuth(req, routingConfig)) {
    next();
    return;
  }

  // 3. JWT 토큰 인증 시도
  const headerToken = req.header('x-auth-token');
  const queryToken = req.query.token as string;
  const token = headerToken || queryToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // Add user from payload to request
      (req as any).user = (decoded as any).user;
      next();
      return;
    } catch (error) {
      console.error('JWT 토큰 인증 실패:', error);
    }
  }

  // 모든 인증 방법 실패
  res.status(401).json({ success: false, message: 'No valid authentication found' });
};

// 기본 인증 필요 middleware (auth와 동일)
export const requireAuth = auth;

// 관리자 권한 필요 middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // 먼저 인증 확인
  await new Promise<void>((resolve, reject) => {
    auth(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  });

  // 관리자 권한 확인
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }

  next();
};
