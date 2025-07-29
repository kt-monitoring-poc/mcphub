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
import { deleteMcpServer, getMcpServer } from './mcpService.js';

interface TransportInfo {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  group?: string;
  userServiceTokens?: Record<string, string>; // 세션별 사용자 토큰 저장
}

const transports: Record<string, TransportInfo> = {};

/**
 * 세션의 그룹 정보 조회
 * 
 * 지정된 세션 ID에 연결된 그룹 이름을 반환합니다.
 * 
 * @param {string} sessionId - 조회할 세션 ID
 * @returns {string} 그룹 이름 (그룹이 없으면 빈 문자열)
 */
export const getGroup = (sessionId: string): string => {
  return transports[sessionId]?.group || '';
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
  transports[transport.sessionId] = { transport, group: group };

  // 연결 종료 시 정리 작업
  res.on('close', () => {
    delete transports[transport.sessionId];
    deleteMcpServer(transport.sessionId);
    console.log(`SSE connection closed: ${transport.sessionId}`);
  });

  console.log(
    `New SSE connection established: ${transport.sessionId} with group: ${group || 'global'}`,
  );

  // MCP 서버와 연결
  await getMcpServer(transport.sessionId, group).connect(transport);
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
  const transportData = transports[sessionId];
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
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const group = req.params.group;

  console.log(`Handling MCP other request`);

  // Bearer 인증 확인
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid session ID');
    return;
  }

  const transport = transports[sessionId].transport as StreamableHTTPServerTransport;
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
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const group = req.params.group;
  const body = req.body;

  console.log(
    `Handling MCP post request for sessionId: ${sessionId} and group: ${group} with body: ${JSON.stringify(body)}`,
  );

  // MCPHub Key 인증 수행
  let userServiceTokens: Record<string, string> = {};
  const authHeader = req.headers.authorization;
  const isNewSession = !sessionId || !transports[sessionId];

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
  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId].transport as StreamableHTTPServerTransport;

    // 기존 세션의 사용자 토큰 사용 (새 인증이 있다면 업데이트)
    if (Object.keys(userServiceTokens).length > 0) {
      transports[sessionId].userServiceTokens = userServiceTokens;
    } else if (transports[sessionId].userServiceTokens) {
      userServiceTokens = transports[sessionId].userServiceTokens;
    }

  } else if (!sessionId && isInitializeRequest(req.body)) {
    // 새로운 StreamableHTTP 전송 계층 생성
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        transports[sessionId] = {
          transport,
          group,
          userServiceTokens: userServiceTokens
        };
        console.log('💾 새 세션에 사용자 토큰 저장:', Object.keys(userServiceTokens));
      },
    });

    // 연결 종료 시 정리 작업 설정
    transport.onclose = () => {
      console.log(`Transport closed: ${transport.sessionId}`);
      if (transport.sessionId) {
        delete transports[transport.sessionId];
        deleteMcpServer(transport.sessionId);
        console.log(`MCP connection closed: ${transport.sessionId}`);
      }
    };

    console.log(`MCP connection established: ${transport.sessionId}`);
    console.log(`🔗 사용자 토큰과 함께 MCP 서버 연결 시도...`);
    // MCP 서버와 연결 (사용자 토큰 전달)
    await getMcpServer(transport.sessionId, group, userServiceTokens).connect(transport);
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
  return Object.keys(transports).length;
};
