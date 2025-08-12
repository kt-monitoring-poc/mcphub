/**
 * MCPHub 디버그 로깅 유틸리티
 * 
 * End-to-End 요청 플로우를 추적하기 위한 상세 로깅 시스템
 */

import chalk from 'chalk';

export interface RequestContext {
  requestId: string;
  userId?: string;
  method?: string;
  path?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class DebugLogger {
  private static contexts = new Map<string, RequestContext>();

  /**
   * 새로운 요청 컨텍스트 생성
   */
  static createContext(req: any): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: RequestContext = {
      requestId,
      method: req.method,
      path: req.path || req.url,
      timestamp: new Date(),
      metadata: {
        headers: req.headers,
        query: req.query,
        body: req.body ? { ...req.body, password: '[REDACTED]' } : undefined
      }
    };

    this.contexts.set(requestId, context);

    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));
    console.log(chalk.cyan(`🚀 [${requestId}] NEW REQUEST STARTED`));
    console.log(chalk.cyan(`📍 ${context.method} ${context.path}`));
    console.log(chalk.cyan(`🕐 ${context.timestamp.toISOString()}`));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));

    return requestId;
  }

  /**
   * 인증 단계 로깅
   */
  static logAuth(requestId: string, authType: string, authData: any, success: boolean) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow(`🔐 [${requestId}] AUTHENTICATION`));
    console.log(chalk.yellow(`   Type: ${authType}`));
    console.log(chalk.yellow(`   Success: ${success ? '✅' : '❌'}`));

    if (authData) {
      if (authData.userId) context.userId = authData.userId;
      console.log(chalk.yellow(`   User: ${authData.username || authData.userId || 'Unknown'}`));
      console.log(chalk.yellow(`   MCPHub Key: ${authData.mcphubKey ? authData.mcphubKey.substring(0, 20) + '...' : 'None'}`));
    }

    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }

  /**
   * 데이터베이스 쿼리 로깅
   */
  static logDB(requestId: string, operation: string, table: string, data?: any) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.green(`🗄️  [${requestId}] DATABASE ${operation}`));
    console.log(chalk.green(`   Table: ${table}`));
    if (data) {
      console.log(chalk.green(`   Data: ${JSON.stringify(data, null, 2)}`));
    }
  }

  /**
   * MCP 서버 연결 로깅
   */
  static logMCPConnection(requestId: string, serverName: string, transport: string, status: 'connecting' | 'connected' | 'failed', error?: any) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.magenta('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.magenta(`🔌 [${requestId}] MCP SERVER CONNECTION`));
    console.log(chalk.magenta(`   Server: ${serverName}`));
    console.log(chalk.magenta(`   Transport: ${transport}`));
    console.log(chalk.magenta(`   Status: ${status === 'connected' ? '✅' : status === 'connecting' ? '⏳' : '❌'} ${status}`));

    if (error) {
      console.log(chalk.red(`   Error: ${error.message || error}`));
    }

    console.log(chalk.magenta('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }

  /**
   * MCP 툴 호출 로깅
   */
  static logToolCall(requestId: string, toolName: string, args: any, serverName?: string) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue(`🔧 [${requestId}] TOOL CALL`));
    console.log(chalk.blue(`   Tool: ${toolName}`));
    if (serverName) console.log(chalk.blue(`   Server: ${serverName}`));
    console.log(chalk.blue(`   Arguments: ${JSON.stringify(args, null, 2)}`));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }

  /**
   * MCP 툴 응답 로깅
   */
  static logToolResponse(requestId: string, toolName: string, response: any, duration: number) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.blue(`🎯 [${requestId}] TOOL RESPONSE`));
    console.log(chalk.blue(`   Tool: ${toolName}`));
    console.log(chalk.blue(`   Duration: ${duration}ms`));
    console.log(chalk.blue(`   Success: ${response.isError ? '❌' : '✅'}`));

    if (response.isError) {
      console.log(chalk.red(`   Error: ${JSON.stringify(response, null, 2)}`));
    } else {
      console.log(chalk.blue(`   Result: ${JSON.stringify(response, null, 2).substring(0, 200)}...`));
    }
  }

  /**
   * 환경변수/토큰 적용 로깅
   */
  static logTokenApplication(requestId: string, serverName: string, tokens: Record<string, string>) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.green(`🔑 [${requestId}] TOKEN APPLICATION`));
    console.log(chalk.green(`   Server: ${serverName}`));
    console.log(chalk.green(`   Tokens Applied: ${Object.keys(tokens).length}`));

    Object.entries(tokens).forEach(([key, value]) => {
      console.log(chalk.green(`   - ${key}: ${value.substring(0, 20)}...`));
    });
  }

  /**
   * 요청 완료 로깅
   */
  static endRequest(requestId: string, statusCode: number, responseData?: any) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    const duration = Date.now() - context.timestamp.getTime();

    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));
    console.log(chalk.cyan(`✅ [${requestId}] REQUEST COMPLETED`));
    console.log(chalk.cyan(`   Status: ${statusCode}`));
    console.log(chalk.cyan(`   Duration: ${duration}ms`));

    if (responseData) {
      console.log(chalk.cyan(`   Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`));
    }

    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));
    console.log('');

    // 컨텍스트 정리
    this.contexts.delete(requestId);
  }

  /**
* 네트워크 요청 로깅
*/
  static logNetworkRequest(requestId: string, method: string, url: string, headers?: any, body?: any) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.cyan(`🌐 [${requestId}] NETWORK REQUEST`));
    console.log(chalk.cyan(`   Method: ${method}`));
    console.log(chalk.cyan(`   URL: ${url}`));

    if (headers) {
      // 네트워크 디버깅을 위해 전체 헤더값 표시 (마스킹 없음)
      console.log(chalk.cyan(`   Headers: ${JSON.stringify(headers, null, 2)}`));
    }

    if (body) {
      // 네트워크 디버깅을 위해 더 많은 바디 데이터 표시
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
      const safeBody = bodyStr.substring(0, 500) + (bodyStr.length > 500 ? '...' : '');
      console.log(chalk.cyan(`   Body: ${safeBody}`));
    }

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }

  /**
   * 네트워크 응답 로깅
   */
  static logNetworkResponse(requestId: string, statusCode: number, responseTime: number, responseData?: any) {
    const context = this.contexts.get(requestId);
    if (!context) return;

    console.log(chalk.cyan(`🌐 [${requestId}] NETWORK RESPONSE`));
    console.log(chalk.cyan(`   Status: ${statusCode}`));
    console.log(chalk.cyan(`   Time: ${responseTime}ms`));

    if (responseData) {
      // 네트워크 디버깅을 위해 더 많은 응답 데이터 표시
      const response = typeof responseData === 'string'
        ? responseData.substring(0, 500) + (responseData.length > 500 ? '...' : '')
        : JSON.stringify(responseData, null, 2).substring(0, 500) + (JSON.stringify(responseData).length > 500 ? '...' : '');
      console.log(chalk.cyan(`   Response: ${response}`));
    }
  }

  /**
   * 에러 로깅
   */
  static logError(requestId: string, error: any, context?: string) {
    console.log(chalk.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.red(`❌ [${requestId}] ERROR${context ? ` in ${context}` : ''}`));
    console.log(chalk.red(`   Message: ${error.message || error}`));

    if (error.stack) {
      console.log(chalk.red(`   Stack: ${error.stack}`));
    }

    console.log(chalk.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }
}

// 환경변수에 따라 디버그 로깅 활성화
export const DEBUG_MODE = process.env.DEBUG_MCPHUB === 'true' || process.env.NODE_ENV === 'development';
