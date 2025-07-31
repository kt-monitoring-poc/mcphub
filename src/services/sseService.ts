/**
 * SSE (Server-Sent Events) 및 MCP 연결 관리 서비스
 * 
 * MCP 클라이언트와의 실시간 통신을 위한 SSE 및 StreamableHTTP 연결을 관리합니다.
 * 세션 기반 연결 관리, 그룹별 라우팅, Bearer 인증 등의 기능을 제공합니다.
 * 
 * 주요 기능:
 * - SSE 연결 설정 및 관리
 * - StreamableHTTP 연결 처리
 * - 세션 기반 전송 계층 관리
 * - 그룹별 라우팅 지원
 * - Bearer 토큰 인증
 * - 연결 상태 모니터링
 */

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import config, { loadSettings } from '../config/index.js';
import { getMcpServer } from './mcpService.js';

/**
 * 전송 계층 정보를 저장하는 인터페이스
 * 
 * 각 세션별로 전송 계층, 그룹, 사용자 토큰 등의 정보를 관리합니다.
 * 연결 상태, 활동 시간, 재연결 시도 등의 모니터링 정보도 포함합니다.
 */
interface TransportInfo {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  group?: string;
  userServiceTokens?: Record<string, string>; // 세션별 사용자 토큰 저장
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivityTime: number; // 마지막 활동 시간
  heartbeatInterval?: NodeJS.Timeout; // Keep-alive 타이머
  reconnectAttempts: number; // 재연결 시도 횟수
  createdAt: number; // 세션 생성 시간
}

// 전송 계층 저장소 (Streamable HTTP + SSE 모두 지원)
const transports: {
  streamable: Record<string, TransportInfo>,
  sse: Record<string, TransportInfo>
} = {
  streamable: {},
  sse: {}
};

// 상수 정의
const HEARTBEAT_INTERVAL = 30000; // 30초
const INACTIVITY_TIMEOUT = 120000; // 2분

/**
 * 세션 상태 모니터링 및 정리
 */
const monitorTransports = () => {
  const now = Date.now();

  Object.entries(transports.streamable).forEach(([sessionId, transportInfo]) => {
    const timeSinceLastActivity = now - transportInfo.lastActivityTime;

    // 비활성 세션 정리
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT && transportInfo.connectionStatus !== 'connected') {
      console.log(`🧹 비활성 세션 정리 (Streamable): ${sessionId}`);
      cleanupTransport(sessionId, 'streamable');
    }
  });

  Object.entries(transports.sse).forEach(([sessionId, transportInfo]) => {
    const timeSinceLastActivity = now - transportInfo.lastActivityTime;

    // 비활성 세션 정리
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT && transportInfo.connectionStatus !== 'connected') {
      console.log(`🧹 비활성 세션 정리 (SSE): ${sessionId}`);
      cleanupTransport(sessionId, 'sse');
    }
  });
};

/**
 * Transport 정리 함수
 */
const cleanupTransport = (sessionId: string, type: 'streamable' | 'sse') => {
  const transportInfo = transports[type][sessionId];
  if (transportInfo) {
    // Heartbeat 타이머 정리
    if (transportInfo.heartbeatInterval) {
      clearInterval(transportInfo.heartbeatInterval);
    }

    // Transport 연결 종료
    try {
      if (transportInfo.transport.onclose) {
        transportInfo.transport.onclose();
      }
    } catch (error) {
      console.error(`Transport 정리 중 오류:`, error);
    }

    delete transports[type][sessionId];
    // MCP 서버 연결 해제는 mcpService에서 처리
    console.log(`🔌 세션 정리 완료: ${sessionId} (Type: ${type})`);
  }
};

/**
 * Heartbeat 전송 함수
 */
const sendHeartbeat = (sessionId: string, type: 'streamable' | 'sse') => {
  const transportInfo = transports[type][sessionId];
  if (transportInfo && transportInfo.connectionStatus === 'connected') {
    try {
      // StreamableHTTP transport에 ping 전송
      if (transportInfo.transport instanceof StreamableHTTPServerTransport) {
        // ping/pong 메커니즘은 클라이언트에서 구현되므로 여기서는 상태만 업데이트
        transportInfo.lastActivityTime = Date.now();
      }
    } catch (error) {
      console.error(`Heartbeat 전송 실패 ${sessionId}:`, error);
      transportInfo.connectionStatus = 'error';
    }
  }
};

// 모니터링 타이머 시작 (1분마다 실행)
setInterval(monitorTransports, 60000);

/**
 * 세션의 그룹 정보 조회
 * 
 * 지정된 세션 ID에 연결된 그룹 이름을 반환합니다.
 * 
 * @param {string} sessionId - 조회할 세션 ID
 * @returns {string} 그룹 이름 (그룹이 없으면 빈 문자열)
 */
export const getGroup = (sessionId: string, type: 'streamable' | 'sse'): string => {
  return transports[type][sessionId]?.group || '';
};

/**
 * Bearer 인증 검증
 * 
 * 시스템 설정의 Bearer 인증 키와 요청의 Bearer 토큰을 비교합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {any} routingConfig - 라우팅 설정 객체
 * @returns {boolean} 인증 성공 여부
 */
const validateBearerAuth = (req: Request, routingConfig?: any): boolean => {
  if (!routingConfig || !routingConfig.enableBearerAuth) {
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  return authHeader.substring(7) === routingConfig.bearerAuthKey;
};

/**
 * 초기화 요청 여부 확인
 * 
 * @param {any} body - 요청 본문
 * @returns {boolean} 초기화 요청 여부
 */
const isInitializeRequest = (body: any): boolean => {
  return body && body.method === 'initialize';
};

/**
 * SSE 연결 처리
 * 
 * 새로운 SSE 연결을 설정하고 MCP 서버와 연결합니다.
 * 그룹별 라우팅과 전역 라우팅 설정을 확인하여 연결을 허용/거부합니다.
 * 
 * @param {Request} req - Express 요청 객체 (group 매개변수 포함 가능)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleSseConnection = async (req: Request, res: Response): Promise<void> => {
  // Bearer 인증 확인
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
  };
  const group = req.params.group;

  // 전역 라우트 접근 권한 확인
  if (!group && !routingConfig.enableGlobalRoute) {
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  // SSE 전송 계층 생성 및 등록
  const transport = new SSEServerTransport(`${config.basePath}/messages`, res);
  transports.sse[transport.sessionId] = { transport, group: group, connectionStatus: 'connecting', lastActivityTime: Date.now(), reconnectAttempts: 0, createdAt: Date.now() };

  // 연결 종료 시 정리 작업
  res.on('close', () => {
    cleanupTransport(transport.sessionId, 'sse');
    console.log(`SSE connection closed: ${transport.sessionId}`);
  });

  console.log(
    `New SSE connection established: ${transport.sessionId} with group: ${group || 'global'}`,
  );

  // MCP 서버와 연결
  await getMcpServer(transport.sessionId, group).connect(transport);
};

/**
 * 레거시 SSE 클라이언트를 위한 호환성 엔드포인트
 * Protocol version 2025-06-18 지원
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체  
 * @param {string} group - 서버 그룹 (옵션)
 * @param {Record<string, string>} userServiceTokens - 사용자 서비스 토큰
 */
export const handleLegacySseEndpoint = async (
  req: Request,
  res: Response,
  group?: string,
  userServiceTokens: Record<string, string> = {}
) => {
  console.log('🔗 레거시 SSE 연결 설정 중...');

  // SSE 전송 계층 생성
  const transport = new SSEServerTransport('/messages', res);
  const now = Date.now();

  transports.sse[transport.sessionId] = {
    transport,
    group: group,
    userServiceTokens: userServiceTokens,
    connectionStatus: 'connecting',
    lastActivityTime: now,
    reconnectAttempts: 0,
    createdAt: now
  };

  // Heartbeat 설정
  transports.sse[transport.sessionId].heartbeatInterval = setInterval(() => {
    sendHeartbeat(transport.sessionId, 'sse');
  }, HEARTBEAT_INTERVAL);

  // 연결 종료 시 정리 작업
  res.on('close', () => {
    cleanupTransport(transport.sessionId, 'sse');
    console.log(`🔌 레거시 SSE 연결 종료: ${transport.sessionId}`);
  });

  console.log(`🔗 레거시 SSE 세션 생성됨: ${transport.sessionId} (protocol 2025-06-18)`);

  // MCP 서버와 연결
  await getMcpServer(transport.sessionId, group, userServiceTokens).connect(transport);

  // 연결 성공 시 상태 업데이트
  transports.sse[transport.sessionId].connectionStatus = 'connected';
  console.log(`✅ 레거시 SSE 세션 연결 완료: ${transport.sessionId}`);
};

/**
 * 레거시 메시지 엔드포인트 (POST /messages)
 * SSE 클라이언트의 메시지 처리용
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 */
export const handleLegacyMessages = async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  // 세션 ID 유효성 검사
  if (!sessionId) {
    console.error('Missing sessionId in query parameters');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  // 전송 계층 존재 확인
  const transportData = transports.sse[sessionId];
  if (!transportData) {
    console.warn(`No transport found for sessionId: ${sessionId}`);
    res.status(404).send('No transport found for sessionId');
    return;
  }

  const { transport, group } = transportData;
  console.log(`Received message for sessionId: ${sessionId} in group: ${group}`);

  // 세션 활동 시간 업데이트
  transports.sse[sessionId].lastActivityTime = Date.now();

  // SSE 전송 계층을 통해 메시지 처리
  await (transport as SSEServerTransport).handlePostMessage(req, res, req.body);
};

/**
 * SSE 메시지 처리
 * 
 * SSE 연결을 통해 수신된 메시지를 처리합니다.
 * 세션 ID를 기반으로 적절한 전송 계층을 찾아 메시지를 전달합니다.
 * 
 * @param {Request} req - Express 요청 객체 (sessionId 쿼리 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleSseMessage = async (req: Request, res: Response): Promise<void> => {
  // Bearer 인증 확인
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const sessionId = req.query.sessionId as string;

  // 세션 ID 유효성 검사
  if (!sessionId) {
    console.error('Missing sessionId in query parameters');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  // 전송 계층 존재 확인
  const transportData = transports.sse[sessionId];
  if (!transportData) {
    console.warn(`No transport found for sessionId: ${sessionId}`);
    res.status(404).send('No transport found for sessionId');
    return;
  }

  const { transport, group } = transportData;
  console.log(`Received message for sessionId: ${sessionId} in group: ${group}`);

  // SSE 전송 계층을 통해 메시지 처리
  await (transport as SSEServerTransport).handlePostMessage(req, res);
};

/**
 * MCP 기타 요청 처리
 * 
 * MCP 초기화 이외의 기타 요청들을 처리합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleMcpOtherRequest = async (req: Request, res: Response): Promise<void> => {
  // 세션 ID 헤더 가져오기 (대소문자 무관)
  let sessionId: string | undefined;
  const headerKeys = Object.keys(req.headers);
  for (const key of headerKeys) {
    if (key.toLowerCase() === 'mcp-session-id') {
      sessionId = req.headers[key] as string;
      break;
    }
  }
  const group = req.params.group;

  console.log(`Handling MCP other request`);

  // Bearer 인증 확인
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  if (!sessionId || !transports.streamable[sessionId]) {
    res.status(400).send('Invalid session ID');
    return;
  }

  const transport = transports.streamable[sessionId].transport as StreamableHTTPServerTransport;
  await transport.handleRequest(req, res, req.body);
};

/**
 * MCPHub Key를 사용한 사용자 인증
 * 
 * @param {string} token - Bearer 토큰
 * @param {boolean} suppressLogs - 로그 출력 억제 (세션 재사용 시)
 * @returns {Promise<Record<string, string> | null>} 사용자 서비스 토큰 또는 null
 */
const authenticateWithMcpHubKey = async (token: string, suppressLogs = false): Promise<Record<string, string> | null> => {
  if (!token.startsWith('mcphub_')) {
    return null;
  }

  if (!suppressLogs) {
    console.log('🔍 MCPHub Key 감지, 인증 중...');
  }

  try {
    const { MCPHubKeyService } = await import('../services/mcpHubKeyService.js');
    const mcpHubKeyService = new MCPHubKeyService();
    const authResult = await mcpHubKeyService.authenticateKey(token);

    if (authResult) {
      if (!suppressLogs) {
        console.log('✅ MCPHub Key 인증 성공:', authResult.user.githubUsername);
      }
      // 빈 토큰 필터링
      const validTokens = Object.fromEntries(
        Object.entries(authResult.serviceTokens || {}).filter(([_, value]) => value && value.trim() !== '')
      );

      if (!suppressLogs && Object.keys(validTokens).length > 0) {
        console.log('🔑 유효한 사용자 토큰들:', Object.keys(validTokens));
      }

      return validTokens;
    } else {
      if (!suppressLogs) {
        console.log('❌ MCPHub Key 인증 실패');
      }
      return null;
    }
  } catch (error) {
    console.error('❌ MCPHub Key 인증 오류:', error);
    return null;
  }
};

/**
 * MCP POST 요청 처리
 * 
 * MCP 초기화 및 기타 POST 요청들을 처리합니다.
 * StreamableHTTP 전송 계층을 사용하여 실시간 통신을 지원합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleMcpPostRequest = async (req: Request, res: Response): Promise<void> => {
  // 세션 ID 헤더 가져오기 (대소문자 무관)
  let sessionId: string | undefined;
  const headerKeys = Object.keys(req.headers);
  for (const key of headerKeys) {
    if (key.toLowerCase() === 'mcp-session-id') {
      sessionId = req.headers[key] as string;
      break;
    }
  }

  const group = req.params.group;
  const body = req.body;

  console.log(
    `Handling MCP post request for sessionId: ${sessionId} and group: ${group} with body: ${JSON.stringify(body)}`,
  );

  // MCPHub Key 인증 수행
  let userServiceTokens: Record<string, string> = {};
  const authHeader = req.headers.authorization;
  const isNewSession = !sessionId || !transports.streamable[sessionId];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    const authenticatedTokens = await authenticateWithMcpHubKey(token, !isNewSession);
    if (authenticatedTokens) {
      userServiceTokens = authenticatedTokens;
    } else {
      // 일반 Bearer 인증 확인
      const settings = loadSettings();
      const routingConfig = settings.systemConfig?.routing || {};
      if (!validateBearerAuth(req, routingConfig)) {
        res.status(401).send('Bearer authentication required or invalid token');
        return;
      }
    }
  } else {
    res.status(401).send('Authorization header required');
    return;
  }

  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
  };

  // 전역 라우트 접근 권한 확인
  if (!group && !routingConfig.enableGlobalRoute) {
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  if (isNewSession && Object.keys(userServiceTokens).length > 0) {
    console.log('🔑 최종 사용자 서비스 토큰 키들:', Object.keys(userServiceTokens));
  }

  let transport: StreamableHTTPServerTransport;

  // 기존 세션 재사용 또는 새 세션 생성
  if (sessionId && transports.streamable[sessionId]) {
    transport = transports.streamable[sessionId].transport as StreamableHTTPServerTransport;

    // 세션 활동 시간 업데이트
    transports.streamable[sessionId].lastActivityTime = Date.now();
    transports.streamable[sessionId].connectionStatus = 'connected';

    // 기존 세션의 사용자 토큰 사용 (새 인증이 있다면 업데이트)
    if (Object.keys(userServiceTokens).length > 0) {
      transports.streamable[sessionId].userServiceTokens = userServiceTokens;
    } else if (transports.streamable[sessionId].userServiceTokens) {
      userServiceTokens = transports.streamable[sessionId].userServiceTokens || {};
    }

  } else if (!sessionId && isInitializeRequest(req.body)) {
    // 프로토콜 버전 확인
    const protocolVersion = req.body?.params?.protocolVersion;
    console.log(`🔧 MCP 초기화 요청 - 프로토콜 버전: ${protocolVersion || 'unknown'}`);

    // 새로운 StreamableHTTP 전송 계층 생성
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        const now = Date.now();
        const transportInfo: TransportInfo = {
          transport,
          group,
          userServiceTokens: userServiceTokens,
          connectionStatus: 'connecting',
          lastActivityTime: now,
          reconnectAttempts: 0,
          createdAt: now
        };

        // Heartbeat 설정
        transportInfo.heartbeatInterval = setInterval(() => {
          sendHeartbeat(sessionId, 'streamable');
        }, HEARTBEAT_INTERVAL);

        transports.streamable[sessionId] = transportInfo;
        console.log('💾 새 세션에 사용자 토큰 저장:', Object.keys(userServiceTokens));
        console.log(`🔗 세션 생성됨: ${sessionId} (heartbeat 활성화)`);
      },
    });

    // 연결 종료 시 정리 작업 설정
    transport.onclose = () => {
      console.log(`🔌 Transport 연결 종료: ${transport.sessionId}`);
      if (transport.sessionId) {
        cleanupTransport(transport.sessionId, 'streamable');
      }
    };

    console.log(`MCP connection established: ${transport.sessionId}`);
    console.log(`🔗 사용자 토큰과 함께 MCP 서버 연결 시도...`);
    // MCP 서버와 연결 (사용자 토큰 전달)
    await getMcpServer(transport.sessionId, group, userServiceTokens).connect(transport);

    // 연결 성공 시 상태 업데이트
    if (transport.sessionId && transports.streamable[transport.sessionId]) {
      transports.streamable[transport.sessionId].connectionStatus = 'connected';
      console.log(`✅ 세션 연결 완료: ${transport.sessionId}`);
    }
  } else {
    // 유효하지 않은 요청
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  console.log(`Handling request using transport with type ${transport.constructor.name}`);

  // 세션 활동 시간 업데이트
  if (transport.sessionId && transports.streamable[transport.sessionId]) {
    transports.streamable[transport.sessionId].lastActivityTime = Date.now();
  }

  // Keep-Alive 응답 헤더 설정
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=60, max=1000');

  // 전송 계층을 통해 요청 처리
  await transport.handleRequest(req, res, req.body);
};

/**
 * 현재 활성 연결 수 조회
 * 
 * 현재 활성화된 전송 계층의 수를 반환합니다.
 * 모니터링 및 디버깅 목적으로 사용됩니다.
 * 
 * @returns {number} 활성 연결 수
 */
export const getConnectionCount = (): number => {
  return Object.keys(transports.streamable).length + Object.keys(transports.sse).length;
};

/**
 * 세션 상태 정보 조회
 * 
 * @returns {Array} 모든 활성 세션의 상태 정보
 */
export const getConnectionStatus = () => {
  const allTransports = { ...transports.streamable, ...transports.sse };
  return Object.entries(allTransports).map(([sessionId, transportInfo]) => ({
    sessionId,
    status: transportInfo.connectionStatus,
    group: transportInfo.group,
    lastActivity: new Date(transportInfo.lastActivityTime).toISOString(),
    uptime: Date.now() - transportInfo.createdAt,
    reconnectAttempts: transportInfo.reconnectAttempts,
    hasUserTokens: transportInfo.userServiceTokens ? Object.keys(transportInfo.userServiceTokens).length > 0 : false
  }));
};

/**
 * 특정 세션의 상세 정보 조회
 * 
 * @param {string} sessionId - 세션 ID
 * @returns {object|null} 세션 정보 또는 null
 */
export const getSessionInfo = (sessionId: string) => {
  const transportInfo = transports.streamable[sessionId] || transports.sse[sessionId];
  if (!transportInfo) return null;

  return {
    sessionId,
    status: transportInfo.connectionStatus,
    group: transportInfo.group,
    lastActivity: new Date(transportInfo.lastActivityTime).toISOString(),
    createdAt: new Date(transportInfo.createdAt).toISOString(),
    uptime: Date.now() - transportInfo.createdAt,
    reconnectAttempts: transportInfo.reconnectAttempts,
    userTokens: transportInfo.userServiceTokens ? Object.keys(transportInfo.userServiceTokens) : []
  };
};
