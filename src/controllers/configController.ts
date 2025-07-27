/**
 * 설정 관리 컨트롤러
 * 
 * 시스템 설정과 런타임 구성 정보를 제공하는 API 엔드포인트를 처리합니다.
 * 프론트엔드에서 필요한 설정 정보와 공개 설정을 제공합니다.
 * 
 * 주요 기능:
 * - 런타임 설정 정보 제공
 * - 공개 시스템 설정 조회 (인증 없이 접근 가능)
 * - 캐시 제어 헤더 설정
 */

import { Request, Response } from 'express';
import config from '../config/index.js';
import { loadSettings } from '../config/index.js';

/**
 * 프론트엔드용 런타임 설정 조회
 * 
 * 프론트엔드에서 필요한 기본 런타임 설정 정보를 반환합니다.
 * 베이스 패스, 버전, 애플리케이션 이름 등의 정보를 포함합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {void} 런타임 설정 정보 또는 오류
 */
export const getRuntimeConfig = (req: Request, res: Response): void => {
  try {
    const runtimeConfig = {
      basePath: config.basePath,
      version: config.mcpHubVersion,
      name: config.mcpHubName,
    };

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      data: runtimeConfig,
    });
  } catch (error) {
    console.error('Error getting runtime config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get runtime configuration',
    });
  }
};

/**
 * 공개 시스템 설정 조회 (인증 불필요)
 * 
 * 인증이 필요하지 않은 공개 설정 정보를 반환합니다.
 * 주로 인증 스킵 여부를 확인하는 데 사용됩니다.
 * 이 엔드포인트는 인증 미들웨어를 거치지 않아야 합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {void} 공개 설정 정보 또는 오류
 */
export const getPublicConfig = (req: Request, res: Response): void => {
  try {
    // Future public configuration can be added here
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      data: {
        // Reserved for future public configuration
      },
    });
  } catch (error) {
    console.error('Error getting public config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get public configuration',
    });
  }
};
