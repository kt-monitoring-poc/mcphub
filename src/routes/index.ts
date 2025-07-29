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
  createUserKey,
  deactivateKey,
  deleteUserKey,
  extendKeyExpiry,
  getFullKeyValue,
  getKeyTokens,
  getKeyValue,
  getCurrentUser as getOAuthUser,
  getUserKeys,
  handleGithubCallback,
  initiateGithubLogin,
  logout,
  updateKeyTokens
} from '../controllers/oauthController.js';
import {
  createServer,
  deleteServer,
  getAllServers,
  getAllSettings,
  toggleServer,
  toggleTool,
  updateServer,
  updateSystemConfig,
  updateToolDescription,
} from '../controllers/serverController.js';
import { callTool } from '../controllers/toolController.js';
import { UserTokenController } from '../controllers/userTokenController.js';
import { auth } from '../middlewares/auth.js';

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
  // New route for batch updating servers in a group
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

  app.use(`${config.basePath}/api`, router);
};

export default router;
