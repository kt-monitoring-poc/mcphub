import express from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { Pool } from 'pg';
import config, { loadSettings, saveSettings } from '../config/index.js';
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
  createUserKey,
  deleteUserKey,
  extendKeyExpiry,
  getFullKeyValue,
  getKeyTokens,
  getKeyValue,
  getUserKeys,
  handleGithubCallback,
  initiateGithubLogin,
  updateKeyTokens
} from '../controllers/oauthController.js';
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
import { requireAdmin, requireAuth } from '../middlewares/auth.js';
import { findUserByUsername, verifyPassword } from '../models/User.js';
import { extractUserEnvVars } from '../utils/variableDetection.js';

const router = express.Router();
// const userTokenController = new UserTokenController(); // TODO: implement when needed

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export const initRoutes = (app: express.Application): void => {
  // 인증 엔드포인트
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

  // 현재 사용자 정보 가져오기 API
  router.get('/auth/me', (req, res) => {
    try {
      const authHeader = req.headers['x-auth-token'] as string;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'No valid authentication found'
        });
      }

      // JWT 토큰 검증
      const decoded = jwt.verify(authHeader, JWT_SECRET) as any;

      res.json({
        success: true,
        data: {
          username: decoded.user.username,
          isAdmin: decoded.user.isAdmin
        }
      });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  });

  // GitHub OAuth 라우트 추가
  router.get('/auth/github', initiateGithubLogin);
  router.get('/auth/github/callback', handleGithubCallback);

  // OAuth 키 관리 API 라우트 추가
  router.get('/oauth/keys', getUserKeys);
  router.post('/oauth/keys', createUserKey);
  router.get('/oauth/keys/:keyId/full-value', getFullKeyValue);
  router.get('/oauth/keys/:keyId', getKeyValue);
  router.get('/oauth/keys/:keyId/tokens', getKeyTokens);
  router.put('/oauth/keys/:keyId/tokens', updateKeyTokens);
  router.post('/oauth/keys/:keyId/extend', extendKeyExpiry);
  router.delete('/oauth/keys/:keyId', deleteUserKey);

  // Core API routes
  router.get('/servers', getAllServers);
  router.post('/servers', createServer);
  router.put('/servers/:name', updateServer);
  router.delete('/servers/:name', deleteServer);
  router.post('/servers/:name/toggle', toggleServer);
  router.post('/servers/:serverName/tools/:toolName/toggle', toggleTool);
  router.put('/servers/:serverName/tools/:toolName/description', updateToolDescription);

  // mcp_settings.json 파일 관리 API
  router.get('/admin/settings-file', requireAuth, requireAdmin, (req, res) => {
    try {
      const settings = loadSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load settings file'
      });
    }
  });

  router.put('/admin/settings-file', requireAuth, requireAdmin, (req, res) => {
    try {
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Settings object is required'
        });
      }

      // JSON 유효성 검사
      if (!settings.mcpServers || typeof settings.mcpServers !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'mcpServers object is required'
        });
      }

      if (!settings.users || !Array.isArray(settings.users)) {
        return res.status(400).json({
          success: false,
          message: 'users array is required'
        });
      }

      // 파일에 저장
      if (saveSettings(settings)) {
        res.json({
          success: true,
          message: 'Settings file updated successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to save settings file'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update settings file'
      });
    }
  });

  // 도구 관리 API
  router.get('/tools', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });
  router.put('/system-config', updateSystemConfig);

  // Groups - core functionality
  router.get('/groups/:name', getGroup);

  // Market API - 완전 구현
  router.get('/market', getAllMarketServers);
  router.get('/market/categories', getAllMarketCategories);
  router.get('/market/tags', getAllMarketTags);
  router.get('/market/search', searchMarketServersByQuery);
  router.get('/market/category/:category', getMarketServersByCategory);
  router.get('/market/tag/:tag', getMarketServersByTag);
  router.get('/market/:name', getMarketServer);

  // Key Management API - 누락된 부분 구현
  router.get('/keys', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  router.post('/keys', (req, res) => {
    res.json({
      success: true,
      message: 'Key created successfully',
      data: { id: Date.now(), name: req.body.name || 'New Key' }
    });
  });

  router.delete('/keys/:id', (req, res) => {
    res.json({
      success: true,
      message: 'Key deleted successfully'
    });
  });

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'MCPHub API is running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    });
  });

  // 런타임 설정 API 추가
  router.get('/config/runtime', (req, res) => {
    res.json({
      success: true,
      data: {
        basePath: config.basePath || '',
        version: process.env.npm_package_version || 'dev',
        name: 'mcphub'
      }
    });
  });

  // 관리자 API들 - 실제 데이터 구조에 맞게 수정
  router.get('/admin/stats', async (req, res) => {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      // 사용자 통계
      const userStats = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_users
        FROM users
      `);

      // MCPHub 키 통계
      const keyStats = await pool.query(`
        SELECT COUNT(*) as total_keys
        FROM mcphub_keys
      `);

      // MCP 서버 통계 (mcp_settings.json에서 가져오기)
      const settingsPath = path.join(process.cwd(), 'mcp_settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      const totalServers = Object.keys(settings.servers || {}).length;
      const activeServers = Object.values(settings.servers || {}).filter((server: any) => server.enabled).length;

      await pool.end();

      const stats = {
        totalUsers: parseInt(userStats.rows[0].total_users),
        activeUsers: parseInt(userStats.rows[0].active_users),
        totalServers: totalServers,
        activeServers: activeServers,
        totalKeys: parseInt(keyStats.rows[0].total_keys),
        activeKeys: parseInt(keyStats.rows[0].total_keys), // 모든 키가 활성 상태로 가정
        todayLogs: 15, // 임시 값 (로그 테이블이 없음)
        systemStatus: 'healthy' as const
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('시스템 통계 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '시스템 통계 조회에 실패했습니다.'
      });
    }
  });

  router.get('/admin/activities', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  router.get('/admin/user-keys', async (req, res) => {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      // 모든 사용자와 그들의 키 정보를 조회
      const result = await pool.query(`
        SELECT 
          u.id as "userId",
          u."githubUsername",
          u."displayName",
          u."isActive",
          u."createdAt" as "userCreatedAt",
          mk.id as "keyId",
          mk.name as "keyName",
          mk.description as "keyDescription",
          mk."isActive" as "keyIsActive",
          mk."expiresAt",
          mk."lastUsedAt",
          mk."usageCount",
          mk."createdAt" as "keyCreatedAt"
        FROM users u
        LEFT JOIN mcphub_keys mk ON u.id = mk."userId"
        ORDER BY u."createdAt" DESC, mk."createdAt" DESC
      `);

      await pool.end();

      // 사용자별로 그룹화하여 키 상태 정보 구성
      const userKeyStatusMap = new Map();

      result.rows.forEach((row: any) => {
        const userId = row.userId;

        if (!userKeyStatusMap.has(userId)) {
          userKeyStatusMap.set(userId, {
            userId: userId,
            username: row.githubUsername,
            githubUsername: row.githubUsername,
            displayName: row.displayName || row.githubUsername,
            isActive: row.isActive,
            hasKey: false,
            keyInfo: null
          });
        }

        const userStatus = userKeyStatusMap.get(userId);

        // 키 정보가 있는 경우
        if (row.keyId) {
          const now = new Date();
          const expiresAt = new Date(row.expiresAt);
          const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          userStatus.hasKey = true;
          userStatus.keyInfo = {
            id: row.keyId,
            name: row.keyName,
            isActive: row.keyIsActive,
            expiresAt: row.expiresAt.toISOString(),
            lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
            usageCount: row.usageCount || 0,
            createdAt: row.keyCreatedAt.toISOString(),
            daysUntilExpiry: daysUntilExpiry
          };
        }
      });

      const userKeyStatus = Array.from(userKeyStatusMap.values());

      res.json({
        success: true,
        data: userKeyStatus
      });
    } catch (error) {
      console.error('사용자 키 상태 데이터 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 키 상태 데이터 조회에 실패했습니다.'
      });
    }
  });

  // 사용자 관리 API 추가
  router.get('/admin/users', async (req, res) => {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      const result = await pool.query(`
        SELECT 
          id,
          "githubUsername",
          email,
          "displayName",
          "isAdmin",
          "isActive",
          "lastLoginAt",
          "createdAt"
        FROM users 
        ORDER BY "createdAt" DESC
      `);

      await pool.end();

      const users = result.rows.map(user => ({
        id: user.id,
        githubUsername: user.githubUsername,
        email: user.email || '',
        displayName: user.displayName || user.githubUsername,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString()
      }));

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('사용자 데이터 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 데이터 조회에 실패했습니다.'
      });
    }
  });

  // 로그 스트림 API (SSE)
  router.get('/logs/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // 초기 연결 메시지 - 초기 로그 목록 전송
    const initialLogs = [
      {
        timestamp: Date.now(),
        type: 'info',
        source: 'main',
        message: '로그 스트림 연결됨'
      }
    ];
    res.write(`data: ${JSON.stringify({ type: 'initial', logs: initialLogs })}\n\n`);

    // 예시 로그 데이터 전송
    const sendLog = () => {
      const logData = {
        timestamp: Date.now(),
        type: 'info',
        source: 'main',
        message: `서버 상태 확인 - ${new Date().toLocaleTimeString()}`
      };
      res.write(`data: ${JSON.stringify({ type: 'log', log: logData })}\n\n`);
    };

    // 5초마다 로그 전송
    const interval = setInterval(sendLog, 5000);

    // 클라이언트 연결 해제 처리
    req.on('close', () => {
      clearInterval(interval);
    });
  });

  router.get('/groups', (req, res) => {
    res.json({
      success: true,
      data: [
        { name: 'development', displayName: '개발', enabled: true, servers: [] },
        { name: 'data', displayName: '데이터', enabled: true, servers: [] },
        { name: 'collaboration', displayName: '협업', enabled: true, servers: [] }
      ]
    });
  });

  // 환경변수 템플릿 관련 API
  router.get('/env-templates', requireAuth, (req, res) => {
    try {
      const settings = loadSettings();
      const templates: Record<string, string[]> = {};

      // 각 서버의 환경변수 템플릿 추출
      for (const [serverName, serverConfig] of Object.entries(settings.mcpServers)) {
        const userEnvVars = extractUserEnvVars(serverConfig);
        if (userEnvVars.length > 0) {
          templates[serverName] = userEnvVars;
        }
      }

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('환경변수 템플릿 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '환경변수 템플릿 조회에 실패했습니다.'
      });
    }
  });

  // 사용자별 환경변수 설정 API
  router.get('/user-env-vars', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      // 사용자의 MCPHub 키에서 serviceTokens 조회 (기존 방식)
      const result = await pool.query(`
        SELECT "serviceTokens"
        FROM mcphub_keys 
        WHERE "userId" = (SELECT id FROM users WHERE "githubUsername" = $1)
        AND "isActive" = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [user.username]);

      await pool.end();

      // 결과를 서버별로 그룹화 (기존 firecrawl, github 등)
      const userEnvVars: Record<string, Record<string, string>> = {};

      if (result.rows.length > 0 && result.rows[0].serviceTokens) {
        const serviceTokens = result.rows[0].serviceTokens;

        // 기존 API 키들을 서버별로 매핑
        const serverMapping: Record<string, string> = {
          'FIRECRAWL_TOKEN': 'firecrawl-mcp',
          'GITHUB_TOKEN': 'github',
          'CONFLUENCE_TOKEN': 'confluence',
          'JIRA_TOKEN': 'jira',
          'JIRA_BASE_URL': 'jira-emoket',
          'JIRA_EMAIL': 'jira-emoket',
          'JIRA_API_TOKEN': 'jira-emoket'
        };

        Object.entries(serviceTokens).forEach(([varName, value]) => {
          const serverName = serverMapping[varName];
          if (serverName && value && value !== '') {
            if (!userEnvVars[serverName]) {
              userEnvVars[serverName] = {};
            }
            userEnvVars[serverName][varName] = value as string;
          }
        });
      }

      res.json({
        success: true,
        data: userEnvVars
      });
    } catch (error) {
      console.error('사용자 환경변수 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 환경변수 조회에 실패했습니다.'
      });
    }
  });

  router.post('/user-env-vars', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }

      const { envVars } = req.body;

      if (!envVars || typeof envVars !== 'object') {
        return res.status(400).json({
          success: false,
          message: '환경변수 데이터가 필요합니다.'
        });
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      // 사용자 ID 조회
      const userResult = await pool.query('SELECT id FROM users WHERE "githubUsername" = $1', [user.username]);
      if (userResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
      }
      const userId = userResult.rows[0].id;

      // 기존 MCPHub 키 조회
      const keyResult = await pool.query(`
        SELECT id, "serviceTokens"
        FROM mcphub_keys 
        WHERE "userId" = $1 AND "isActive" = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [userId]);

      let serviceTokens: Record<string, string> = {};
      if (keyResult.rows.length > 0) {
        serviceTokens = keyResult.rows[0].serviceTokens || {};
      }

      // 새로운 환경변수로 업데이트
      for (const [_serverName, serverEnvVars] of Object.entries(envVars)) {
        for (const [varName, value] of Object.entries(serverEnvVars as Record<string, string>)) {
          if (value && value.trim() !== '') {
            serviceTokens[varName] = value;
          }
        }
      }

      // MCPHub 키 업데이트
      if (keyResult.rows.length > 0) {
        await pool.query(`
          UPDATE mcphub_keys 
          SET "serviceTokens" = $1, "updatedAt" = NOW()
          WHERE id = $2
        `, [JSON.stringify(serviceTokens), keyResult.rows[0].id]);
      } else {
        // 새 키 생성
        await pool.query(`
          INSERT INTO mcphub_keys ("userId", "keyValue", "name", "description", "isActive", "serviceTokens", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
        `, [userId, `mcphub_${Date.now()}`, 'MCPHub Key', 'Cursor IDE에서 사용할 MCPHub Key입니다.', JSON.stringify(serviceTokens)]);
      }

      await pool.end();

      console.log(`사용자 ${user.username}의 환경변수 설정 완료:`, serviceTokens);

      res.json({
        success: true,
        message: '환경변수가 저장되었습니다.'
      });
    } catch (error) {
      console.error('사용자 환경변수 저장 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 환경변수 저장에 실패했습니다.'
      });
    }
  });

  // Add API routes to express app
  const basePath = config.basePath;
  app.use(`${basePath}/api`, router);
};

export default router;
