/**
 * 도구 실행 컨트롤러
 * 
 * MCP 도구의 실행과 관련된 API 엔드포인트를 처리합니다.
 * 클라이언트가 특정 MCP 서버의 도구를 호출할 수 있는 인터페이스를 제공합니다.
 * 
 * 주요 기능:
 * - 도구 실행 요청 처리
 * - 도구 호출 결과 반환
 * - 세션 및 서버별 도구 실행 관리
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import { handleCallToolRequest } from '../services/mcpService.js';

/**
 * 도구 호출 요청 인터페이스
 * 클라이언트에서 도구를 호출할 때 사용하는 요청 구조입니다.
 */
export interface ToolCallRequest {
  /** 호출할 도구의 이름 */
  toolName: string;
  /** 도구에 전달할 인수들 (선택사항) */
  arguments?: Record<string, any>;
}

/**
 * 도구 검색 요청 인터페이스
 * 도구를 검색할 때 사용하는 요청 구조입니다.
 */
export interface ToolSearchRequest {
  /** 검색 쿼리 */
  query: string;
  /** 검색 결과 제한 수 (선택사항) */
  limit?: number;
}

/**
 * 도구 호출 결과 인터페이스
 * MCP 서버에서 반환되는 도구 실행 결과의 구조입니다.
 */
interface ToolCallResult {
  /** 도구 실행 결과 내용 */
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  /** 오류 발생 여부 */
  isError?: boolean;
  /** 기타 추가 속성들 */
  [key: string]: any;
}

/**
 * 특정 도구를 주어진 인수로 호출
 * 
 * 지정된 MCP 서버의 도구를 실행하고 결과를 반환합니다.
 * 세션 ID를 통해 세션별 상태를 관리하며, 서버별로 도구를 구분하여 실행합니다.
 * 
 * @param {Request} req - Express 요청 객체
 *   - params.server: 대상 서버 이름 (선택사항)
 *   - body.toolName: 실행할 도구 이름
 *   - body.arguments: 도구에 전달할 인수들
 *   - headers['x-session-id']: 세션 ID (선택사항)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 도구 실행 결과 또는 오류
 */
export const callTool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { server } = req.params;
    const { toolName, arguments: toolArgs = {} } = req.body as ToolCallRequest;

    // 도구 이름 필수 검사
    if (!toolName) {
      res.status(400).json({
        success: false,
        message: 'toolName is required',
      });
      return;
    }

    // MCP 서비스의 handleCallToolRequest를 위한 모의 요청 구조 생성
    const mockRequest = {
      params: {
        name: 'call_tool',
        arguments: {
          toolName,
          arguments: toolArgs,
        },
      },
    };

    // 추가 컨텍스트 정보 (세션 ID 및 서버 정보)
    const extra = {
      sessionId: req.headers['x-session-id'] || 'api-session',
      server: server || undefined,
    };

    // MCP 서비스를 통해 도구 실행
    const result = (await handleCallToolRequest(mockRequest, extra)) as ToolCallResult;

    // 성공 응답 생성
    const response: ApiResponse = {
      success: true,
      data: {
        content: result.content || [],
        toolName,
        arguments: toolArgs,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error calling tool:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to call tool',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
