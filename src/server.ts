/**
 * MCPHub 애플리케이션 서버 클래스
 * 
 * Express 서버를 기반으로 하는 MCPHub의 메인 서버 클래스입니다.
 * - Express 앱 설정 및 미들웨어 초기화
 * - MCP 서버들과의 연결 관리
 * - 프론트엔드 정적 파일 서빙
 * - SSE 및 HTTP 엔드포인트 설정
 */

import cors from 'cors';
import express from 'express';
import session from 'express-session';
import http from 'http';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import { configurePassport, validateGitHubOAuthConfig } from './config/passport.js';
import { initializeDatabase } from './db/connection.js';
import { initMiddlewares } from './middlewares/index.js';
import { initializeDefaultUser } from './models/User.js';
import { initRoutes } from './routes/index.js';
import { initializeScheduler } from './services/envVarScheduler.js';
import { getServersInfo, initUpstreamServers } from './services/mcpService.js';
import {
  handleMcpOtherRequest,
  handleMcpPostRequest,
  handleSseConnection,
  handleSseMessage,
} from './services/sseService.js';
import { DEBUG_MODE, DebugLogger } from './utils/debugLogger.js';
import { quickValidation } from './utils/envVarValidation.js';

// ESM 환경에서 __dirname 구하기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AppServer {
  private app: express.Application;
  private port: number | string;
  private basePath: string;

  /**
   * AppServer 생성자
   * 
   * Express 애플리케이션을 초기화하고 기본 설정을 구성합니다.
   */
  constructor() {
    this.app = express();
    this.port = config.port;
    this.basePath = config.basePath;
  }

  /**
   * 서버 초기화 메소드
   * 
   * 다음 작업들을 순차적으로 수행합니다:
   * 1. 기본 관리자 사용자 초기화
   * 2. 미들웨어 및 라우터 설정
   * 3. MCP 서버들 연결 초기화
   * 4. SSE 및 MCP 엔드포인트 설정
   * 5. 프론트엔드 정적 파일 서빙 설정
   * 
   * @throws {Error} 초기화 과정에서 오류 발생 시
   */
  async initialize(): Promise<void> {
    try {
      // 데이터베이스 초기화
      await initializeDatabase();
      console.log('✅ 데이터베이스 초기화 완료');

      // 사용자가 없는 경우 기본 관리자 사용자 생성
      await initializeDefaultUser();

      // GitHub OAuth 설정 검증
      const oauthConfig = validateGitHubOAuthConfig();
      if (oauthConfig.isValid) {
        console.log('✅ GitHub OAuth 설정이 유효합니다.');
      } else {
        console.warn('⚠️ GitHub OAuth 설정이 불완전합니다. OAuth 기능이 비활성화됩니다.');
      }

      // Express 세션 설정 (Passport.js용)
      this.app.use(session({
        secret: process.env.SESSION_SECRET || 'mcphub-default-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production', // HTTPS에서만 true
          maxAge: 24 * 60 * 60 * 1000 // 24시간
        }
      }));

      // Passport.js 초기화
      this.app.use(passport.initialize());
      this.app.use(passport.session());

      // Passport.js OAuth 전략 설정
      if (oauthConfig.isValid) {
        configurePassport();
      }

      // Express 미들웨어 초기화 (CORS, 바디 파서 등)
      initMiddlewares(this.app);

      // 디버그 로깅 미들웨어
      if (DEBUG_MODE) {
        this.app.use((req, res, next) => {
          const requestId = DebugLogger.createContext(req);
          (req as any).requestId = requestId;

          // 응답 완료 시 로깅
          const originalSend = res.send;
          const originalJson = res.json;

          res.send = function (data: any) {
            DebugLogger.endRequest(requestId, res.statusCode, data);
            return originalSend.call(this, data);
          };

          res.json = function (data: any) {
            DebugLogger.endRequest(requestId, res.statusCode, data);
            return originalJson.call(this, data);
          };

          next();
        });
      } else {
        // 기본 요청 로깅 (필수 정보만)
        this.app.use((req, res, next) => {
          // API 요청만 간단히 로깅
          if (req.path.startsWith('/api/') || req.path.startsWith('/mcp')) {
            console.log(`${req.method} ${req.path}`);
          }
          next();
        });
      }

      // MCP 서버 관리 라우트 추가 (initRoutes 이전에 등록)
      // TODO: DB 시스템 오류 해결 후 활성화
      // const mcpServerRoutes = await import('./routes/mcpServerRoutes.js');
      // this.app.use(`${config.basePath}/api/mcp`, mcpServerRoutes.default);

      // CORS 미들웨어 설정 (프론트엔드/백엔드 분리)
      this.app.use(cors({
        origin: [
          'http://localhost:5173',  // Vite 개발 서버
          'http://localhost:3001',  // 대체 프론트엔드 포트
          'https://mcphub.company.com'  // 운영 환경 (필요시 수정)
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Accept']
      }));

      // Routes 초기화 (API 라우트를 먼저 등록)
      initRoutes(this.app);

      // MCP 요청 처리 엔드포인트 (MCP 표준 준수 - /mcp만 사용)
      this.app.post(`${this.basePath}/mcp`, handleMcpPostRequest);
      this.app.get(`${this.basePath}/mcp`, handleMcpOtherRequest);
      this.app.delete(`${this.basePath}/mcp`, handleMcpOtherRequest);

      // 프론트엔드 정적 파일 서빙 제거 (프론트엔드/백엔드 분리)
      // this.findAndServeFrontend(); // 분리 후 사용 안함

      // MCP 서버들 초기화 및 연결
      initUpstreamServers()
        .then(() => {
          console.log('✅ MCP 서버 초기화 프로세스 완료');

          // SSE 연결 엔드포인트 설정 (실시간 통신용)
          this.app.get(`${this.basePath}/sse/:group?`, (req, res) => handleSseConnection(req, res));

          // SSE 메시지 처리 엔드포인트
          this.app.post(`${this.basePath}/messages`, handleSseMessage);
        })
        .catch((error) => {
          console.error('Error initializing MCP server:', error);
          throw error;
        });
    } catch (error) {
      console.error('Error initializing server:', error);
      throw error;
    }
  }

  /**
 * 프론트엔드/백엔드 분리로 인해 제거됨
 * 백엔드는 API와 MCP endpoint만 제공
 */
  // private findAndServeFrontend(): void { ... } // 제거됨

  /**
   * HTTP 서버 시작
   * 
   * 설정된 포트에서 Express 서버를 시작하고 접속 정보를 출력합니다.
   * HTTP/1.1을 사용하여 SSE 호환성을 보장합니다.
   */
  async start(): Promise<void> {
    // 시작 전 환경변수 검증
    console.log('🔍 환경변수 매핑 검증 중...');
    try {
      await quickValidation();
    } catch (error) {
      console.warn(`⚠️  환경변수 검증 실패: ${error}`);
    }

    // 환경변수 자동 관리 스케줄러 시작
    const schedulerConfig = {
      enabled: process.env.NODE_ENV === 'production', // 프로덕션에서만 기본 활성화
      intervalHours: 24, // 24시간마다
      autoCleanup: false, // 기본적으로 자동 정리 비활성화
      maxOrphanedKeys: 10
    };

    if (process.env.ENV_SCHEDULER_ENABLED === 'true') {
      schedulerConfig.enabled = true;
    }

    if (process.env.ENV_AUTO_CLEANUP === 'true') {
      schedulerConfig.autoCleanup = true;
    }

    initializeScheduler(schedulerConfig);

    if (schedulerConfig.enabled) {
      console.log('🕐 환경변수 자동 관리 스케줄러가 활성화되었습니다.');
    }

    // HTTP/1.1 서버 생성 (SSE 호환성을 위해)
    const server = http.createServer(this.app);

    // Keep-alive 설정 - 개발 도구 특성을 고려한 관대한 설정
    server.keepAliveTimeout = 180000; // 3분 (업계 표준보다 관대)
    server.headersTimeout = 181000;   // keepAliveTimeout보다 약간 크게

    server.listen(this.port, () => {
      console.log(`\n🚀 MCPHub Server is running on port ${this.port} (HTTP/1.1)`);

      // MCP 서버 상태 요약
      setTimeout(() => {
        const serverInfos = getServersInfo();
        const connectedServers = serverInfos.filter((s: any) => s.status === 'connected');
        const disconnectedServers = serverInfos.filter((s: any) => s.status === 'disconnected');
        const disabledServers = serverInfos.filter((s: any) => s.enabled === false);

        console.log(`\n📊 MCP Server Status Summary:`);
        console.log(`   ✅ Connected: ${connectedServers.length} servers`);
        if (connectedServers.length > 0) {
          connectedServers.forEach((s: any) => {
            console.log(`      - ${s.name} (${s.tools.length} tools)`);
          });
        }

        if (disconnectedServers.length > 0) {
          console.log(`   ⚠️  Disconnected: ${disconnectedServers.length} servers`);
          disconnectedServers.forEach((s: any) => {
            console.log(`      - ${s.name}`);
          });
        }

        if (disabledServers.length > 0) {
          console.log(`   🔴 Disabled: ${disabledServers.length} servers`);
          disabledServers.forEach((s: any) => {
            console.log(`      - ${s.name}`);
          });
        }

        console.log(`\n💡 MCPHub is ready!`);
        console.log(`   API is available at http://localhost:${this.port}`);
        console.log('');
      }, 1000); // 1초 후에 상태 출력 (서버들이 연결될 시간 확보)
    });
  }

  /**
   * Express 앱 인스턴스 반환
   * 
   * 테스트나 다른 모듈에서 Express 앱에 접근할 수 있도록 합니다.
   * 
   * @returns {express.Application} Express 애플리케이션 인스턴스
   */
  getApp(): express.Application {
    return this.app;
  }

  // 프론트엔드 관련 메서드들 제거됨 (프론트엔드/백엔드 분리)
}

export default AppServer;
