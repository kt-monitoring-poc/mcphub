import express from 'express';
import { check } from 'express-validator';
import passport from 'passport';
import config from '../config/index.js';
import { getRecentActivities, getSystemStats, getUserKeyStatus } from '../controllers/adminController.js';
import { changePassword, getCurrentUser, login, register } from '../controllers/authController.js';
import { getPublicConfig, getRuntimeConfig } from '../controllers/configController.js';
import { uploadDxtFile, uploadMiddleware } from '../controllers/dxtController.js';
import {
  addServerToExistingGroup,
  createNewGroup,
  deleteExistingGroup,
  getGroup,
  getGroups,
  getGroupServers,
  removeServerFromExistingGroup,
  updateExistingGroup,
  updateGroupServersBatch,
} from '../controllers/groupController.js';
import { clearLogs, getAllLogs, streamLogs } from '../controllers/logController.js';
import {
  getAllMarketCategories,
  getAllMarketServers,
  getAllMarketTags,
  getMarketServer,
  getMarketServersByCategory,
  getMarketServersByTag,
  searchMarketServersByQuery,
} from '../controllers/marketController.js';
import {
  createServer,
  deleteServer,
  getAllServers,
  toggleServer,
  toggleTool,
  updateServer,
  updateSystemConfig,
  updateToolDescription
} from '../controllers/serverController.js';
import { callTool } from '../controllers/toolController.js';
import { UserTokenController } from '../controllers/userTokenController.js';
import { auth } from '../middlewares/auth.js';
import {
  getConnectionCount,
  getConnectionStatus,
  getSessionInfo,
  handleLegacyMessages,
  handleLegacySseEndpoint
} from '../services/sseService.js';
import mcpServerRoutes from './mcpServerRoutes.js';

const router = express.Router();
const userTokenController = new UserTokenController();

export const initRoutes = (app: express.Application): void => {
  // API routes protected by auth middleware in middlewares/index.ts
  router.get('/servers', getAllServers);
  router.get('/settings', getAllSettings);
  router.post('/servers', createServer);
  router.put('/servers/:name', updateServer);
  router.delete('/servers/:name', deleteServer);
  router.post('/servers/:name/toggle', toggleServer);
  router.post('/servers/:serverName/tools/:toolName/toggle', toggleTool);
  router.put('/servers/:serverName/tools/:toolName/description', updateToolDescription);
  router.put('/system-config', updateSystemConfig);

  // Group management routes
  router.get('/groups', getGroups);
  router.get('/groups/:id', getGroup);
  router.post('/groups', createNewGroup);
  router.put('/groups/:id', updateExistingGroup);
  router.delete('/groups/:id', deleteExistingGroup);
  router.post('/groups/:id/servers', addServerToExistingGroup);
  router.delete('/groups/:id/servers/:serverName', removeServerFromExistingGroup);
  router.get('/groups/:id/servers', getGroupServers);
  router.put('/groups/:id/servers/batch', updateGroupServersBatch);

  // Tool management routes
  router.post('/tools/call/:server', callTool);

  // DXT upload routes
  router.post('/dxt/upload', uploadMiddleware, uploadDxtFile);

  // Market routes
  router.get('/market/servers', getAllMarketServers);
  router.get('/market/servers/search', searchMarketServersByQuery);
  router.get('/market/servers/:name', getMarketServer);
  router.get('/market/categories', getAllMarketCategories);
  router.get('/market/categories/:category', getMarketServersByCategory);
  router.get('/market/tags', getAllMarketTags);
  router.get('/market/tags/:tag', getMarketServersByTag);

  // Log routes
  router.get('/logs', getAllLogs);
  router.delete('/logs', clearLogs);
  router.get('/logs/stream', streamLogs);

  // Auth routes - move to router instead of app directly
  router.post(
    '/auth/login',
    [
      check('username', 'Username is required').not().isEmpty(),
      check('password', 'Password is required').not().isEmpty(),
    ],
    login,
  );

  router.post(
    '/auth/register',
    [
      check('username', 'Username is required').not().isEmpty(),
      check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    ],
    register,
  );

  router.get('/auth/user', auth, getCurrentUser);

  // Add change password route
  router.post(
    '/auth/change-password',
    [
      auth,
      check('currentPassword', 'Current password is required').not().isEmpty(),
      check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
    ],
    changePassword,
  );

  // GitHub OAuth routes
  router.get('/auth/github', initiateGithubLogin);
  router.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login?error=oauth_failed' }),
    handleGithubCallback
  );
  router.post('/auth/logout', logout);

  // OAuth User routes
  router.get('/oauth/user', auth, getOAuthUser);
  router.get('/oauth/keys', auth, getUserKeys);
  router.post('/oauth/keys', auth, createUserKey);
  router.get('/oauth/keys/:keyId/value', auth, getKeyValue);
  router.get('/oauth/keys/:keyId/full-value', auth, getFullKeyValue);
  router.get('/oauth/keys/:keyId/tokens', auth, getKeyTokens);
  router.put('/oauth/keys/:keyId/tokens', auth, updateKeyTokens);
  router.post('/oauth/keys/:keyId/extend', auth, extendKeyExpiry);
  router.post('/oauth/keys/:keyId/deactivate', auth, deactivateKey);
  router.delete('/oauth/keys/:keyId', auth, deleteUserKey);

  // User token management routes (GitHub MCP)
  router.post('/user-tokens/github', auth, userTokenController.saveGithubToken);
  router.get('/user-tokens/github/status', auth, userTokenController.getGithubTokenStatus);
  router.post('/user-tokens/github/validate', auth, userTokenController.validateGithubToken);
  router.post('/user-tokens/github/server/start', auth, userTokenController.startGithubServer);
  router.post('/user-tokens/github/server/stop', auth, userTokenController.stopGithubServer);
  router.delete('/user-tokens/github', auth, userTokenController.deleteGithubToken);

  // Admin routes
  router.get('/admin/stats', auth, getSystemStats);
  router.get('/admin/activities', auth, getRecentActivities);
  router.get('/admin/user-keys', auth, getUserKeyStatus);

  // Runtime configuration endpoint (no auth required for frontend initialization)
  app.get(`${config.basePath}/config`, getRuntimeConfig);

  // Public configuration endpoint (no auth required to check skipAuth setting)
  app.get(`${config.basePath}/public-config`, getPublicConfig);

  // Health check endpoint (no auth required)
  app.get(`${config.basePath}/health`, (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'MCPHub is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Session monitoring endpoints
  router.get('/api/sessions/status', auth, (req, res) => {
    try {
      const status = {
        totalConnections: getConnectionCount(),
        connections: getConnectionStatus()
      };
      res.json({ success: true, data: status });
    } catch (error) {
      console.error('Session status error:', error);
      res.status(500).json({ success: false, message: 'Failed to get session status' });
    }
  });

  router.get('/api/sessions/:sessionId', auth, (req, res) => {
    try {
      const sessionInfo = getSessionInfo(req.params.sessionId);
      if (!sessionInfo) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }
      res.json({ success: true, data: sessionInfo });
    } catch (error) {
      console.error('Session info error:', error);
      res.status(500).json({ success: false, message: 'Failed to get session info' });
    }
  });

  // MCP 서버 관리 라우트 추가
  app.use(`${config.basePath}/api/mcp`, mcpServerRoutes);

  app.use(`${config.basePath}/api`, router);

  // 🔄 Backwards Compatibility: 레거시 SSE 엔드포인트 (protocol 2024-11-05)
  // 이 엔드포인트들은 오래된 MCP 클라이언트 지원을 위함
  app.get(`${config.basePath}/sse`, async (req, res) => {
    console.log('📡 레거시 SSE 엔드포인트 요청');
    await handleLegacySseEndpoint(req, res);
  });

  app.post(`${config.basePath}/messages`, async (req, res) => {
    console.log('📬 레거시 메시지 엔드포인트 요청');
    await handleLegacyMessages(req, res);
  });
};

export default router;
