/**
 * 로그 관리 컨트롤러
 * 
 * 시스템 로그의 조회, 삭제, 실시간 스트리밍과 관련된 API 엔드포인트를 처리합니다.
 * 서버 사이드 이벤트(SSE)를 통한 실시간 로그 스트리밍을 지원합니다.
 * 
 * 주요 기능:
 * - 모든 로그 조회
 * - 로그 삭제 (초기화)
 * - 실시간 로그 스트리밍 (SSE)
 */

// filepath: /Users/sunmeng/code/github/mcphub/src/controllers/logController.ts
import { Request, Response } from 'express';
import logService from '../services/logService.js';

/**
 * 모든 로그 조회
 * 
 * 시스템에 저장된 모든 로그 항목을 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {void} 로그 목록 또는 오류
 */
export const getAllLogs = (req: Request, res: Response): void => {
  try {
    const logs = logService.getLogs();
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ success: false, error: 'Error getting logs' });
  }
};

/**
 * 모든 로그 삭제
 * 
 * 시스템에 저장된 모든 로그를 삭제합니다.
 * 로그 파일이나 메모리에서 모든 로그 항목을 제거합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {void} 삭제 성공 메시지 또는 오류
 */
export const clearLogs = (req: Request, res: Response): void => {
  try {
    logService.clearLogs();
    res.json({ success: true, message: 'Logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ success: false, error: 'Error clearing logs' });
  }
};

/**
 * 실시간 로그 스트리밍 (SSE)
 * 
 * 서버 사이드 이벤트(Server-Sent Events)를 통해 실시간으로 로그를 스트리밍합니다.
 * 연결 시 기존 로그를 모두 전송하고, 이후 새로운 로그가 생성될 때마다 실시간으로 전송합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {void} SSE 스트림 연결 또는 오류
 */
export const streamLogs = (req: Request, res: Response): void => {
  try {
    // SSE를 위한 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // 초기 데이터 전송 (기존 로그들)
    const logs = logService.getLogs();
    res.write(`data: ${JSON.stringify({ type: 'initial', logs })}\n\n`);

    // 새로운 로그 이벤트 구독
    const unsubscribe = logService.subscribe((log) => {
      res.write(`data: ${JSON.stringify({ type: 'log', log })}\n\n`);
    });

    // 클라이언트 연결 해제 처리
    req.on('close', () => {
      unsubscribe();
      console.log('Client disconnected from log stream');
    });
  } catch (error) {
    console.error('Error streaming logs:', error);
    res.status(500).json({ success: false, error: 'Error streaming logs' });
  }
};