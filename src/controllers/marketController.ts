/**
 * 마켓플레이스 컨트롤러
 * 
 * MCP 서버 마켓플레이스와 관련된 API 엔드포인트를 처리합니다.
 * 사용 가능한 MCP 서버들의 조회, 검색, 필터링 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 마켓 서버 목록 조회
 * - 특정 서버 상세 정보 조회
 * - 카테고리 및 태그별 필터링
 * - 서버 검색 기능
 * - 카테고리 및 태그 목록 조회
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import {
  getMarketServers,
  getMarketServerByName,
  getMarketCategories,
  getMarketTags,
  searchMarketServers,
  filterMarketServersByCategory,
  filterMarketServersByTag
} from '../services/marketService.js';

/**
 * 모든 마켓 서버 조회
 * 
 * 마켓플레이스에서 사용 가능한 모든 MCP 서버의 목록을 반환합니다.
 * 
 * @param {Request} _ - Express 요청 객체 (사용하지 않음)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 마켓 서버 목록 또는 오류
 */
export const getAllMarketServers = (_: Request, res: Response): void => {
  try {
    const marketServers = Object.values(getMarketServers());
    const response: ApiResponse = {
      success: true,
      data: marketServers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market servers information',
    });
  }
};

/**
 * 특정 마켓 서버 조회
 * 
 * 이름으로 지정된 마켓 서버의 상세 정보를 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (name 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 마켓 서버 정보 또는 오류
 */
export const getMarketServer = (req: Request, res: Response): void => {
  try {
    const { name } = req.params;
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    const server = getMarketServerByName(name);
    if (!server) {
      res.status(404).json({
        success: false,
        message: 'Market server not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: server,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market server information',
    });
  }
};

/**
 * 모든 마켓 카테고리 조회
 * 
 * 마켓플레이스에서 사용 가능한 모든 서버 카테고리의 목록을 반환합니다.
 * 
 * @param {Request} _ - Express 요청 객체 (사용하지 않음)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 카테고리 목록 또는 오류
 */
export const getAllMarketCategories = (_: Request, res: Response): void => {
  try {
    const categories = getMarketCategories();
    const response: ApiResponse = {
      success: true,
      data: categories,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market categories',
    });
  }
};

/**
 * 모든 마켓 태그 조회
 * 
 * 마켓플레이스에서 사용 가능한 모든 서버 태그의 목록을 반환합니다.
 * 
 * @param {Request} _ - Express 요청 객체 (사용하지 않음)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 태그 목록 또는 오류
 */
export const getAllMarketTags = (_: Request, res: Response): void => {
  try {
    const tags = getMarketTags();
    const response: ApiResponse = {
      success: true,
      data: tags,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market tags',
    });
  }
};

/**
 * 마켓 서버 검색
 * 
 * 검색 쿼리를 사용하여 마켓 서버를 검색합니다.
 * 서버 이름, 설명, 태그 등을 기준으로 검색을 수행합니다.
 * 
 * @param {Request} req - Express 요청 객체 (query 쿼리 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 검색된 서버 목록 또는 오류
 */
export const searchMarketServersByQuery = (req: Request, res: Response): void => {
  try {
    const { query } = req.query;
    const searchQuery = typeof query === 'string' ? query : '';
    
    const servers = searchMarketServers(searchQuery);
    const response: ApiResponse = {
      success: true,
      data: servers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search market servers',
    });
  }
};

/**
 * 카테고리별 마켓 서버 필터링
 * 
 * 지정된 카테고리에 속하는 마켓 서버들을 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (category 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 필터링된 서버 목록 또는 오류
 */
export const getMarketServersByCategory = (req: Request, res: Response): void => {
  try {
    const { category } = req.params;
    
    const servers = filterMarketServersByCategory(category);
    const response: ApiResponse = {
      success: true,
      data: servers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to filter market servers by category',
    });
  }
};

/**
 * 태그별 마켓 서버 필터링
 * 
 * 지정된 태그를 가진 마켓 서버들을 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (tag 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 필터링된 서버 목록 또는 오류
 */
export const getMarketServersByTag = (req: Request, res: Response): void => {
  try {
    const { tag } = req.params;
    
    const servers = filterMarketServersByTag(tag);
    const response: ApiResponse = {
      success: true,
      data: servers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to filter market servers by tag',
    });
  }
};