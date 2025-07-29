import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import {
  getGroup
} from '../controllers/groupController.js';
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
import { findUserByUsername, verifyPassword } from '../models/User.js';

const router = express.Router();
// const userTokenController = new UserTokenController(); // TODO: implement when needed

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export const initRoutes = (app: express.Application): void => {
  // 인증 엔드포인트 - 임시 추가
  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // 사용자 찾기
      const user = findUserByUsername(username);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // 비밀번호 확인
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // JWT 토큰 생성
      const token = jwt.sign(
        { user: { username: user.username, isAdmin: user.isAdmin } },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          username: user.username,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Core API routes - only keeping working ones for now
  router.get('/servers', getAllServers);
  router.post('/servers', createServer);
  router.put('/servers/:name', updateServer);
  router.delete('/servers/:name', deleteServer);
  router.post('/servers/:name/toggle', toggleServer);
  router.post('/servers/:serverName/tools/:toolName/toggle', toggleTool);
  router.put('/servers/:serverName/tools/:toolName/description', updateToolDescription);
  router.put('/system-config', updateSystemConfig);

  // Groups - core functionality
  router.get('/groups/:name', getGroup);

  // Market
  router.get('/market', getAllMarketServers);
  router.get('/market/categories', getAllMarketCategories);
  router.get('/market/tags', getAllMarketTags);
  router.get('/market/search', searchMarketServersByQuery);
  router.get('/market/category/:category', getMarketServersByCategory);
  router.get('/market/tag/:tag', getMarketServersByTag);
  router.get('/market/:name', getMarketServer);

  // Logs - TODO: implement getLogs
  // router.get('/logs', getLogs);

  // DXT upload functionality - TODO: implement upload middleware
  // router.post('/dxt/upload', upload.single('dxtFile'), uploadDxtFile);

  // Health check - 즉시 구현
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'MCPHub API is running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    });
  });

  // 임시 관리자 API들 - 404 에러 방지
  router.get('/admin/stats', (req, res) => {
    res.json({
      success: true,
      data: {
        totalServers: 5,
        activeServers: 3,
        totalUsers: 1,
        totalRequests: 0,
        systemUptime: process.uptime()
      }
    });
  });

  router.get('/admin/activities', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  router.get('/admin/user-keys', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  router.get('/groups', (req, res) => {
    res.json({
      success: true,
      data: [
        { name: 'development', displayName: '개발', enabled: true },
        { name: 'data', displayName: '데이터', enabled: true },
        { name: 'collaboration', displayName: '협업', enabled: true }
      ]
    });
  });

  // Add API routes to express app
  const basePath = config.basePath;
  app.use(`${basePath}/api`, router);
};

export default router;
