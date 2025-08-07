/**
 * 서버 관리 컨트롤러
 * 
 * MCP 서버들의 생성, 수정, 삭제, 조회 및 관리와 관련된 모든 API 엔드포인트를 처리합니다.
 * 서버 설정, 도구 관리, 시스템 설정 등의 기능을 제공합니다.
 * 
 * 주요 기능:
 * - MCP 서버 CRUD 작업
 * - 서버 상태 토글 (활성화/비활성화)
 * - 개별 도구 관리 (활성화/비활성화, 설명 수정)
 * - 시스템 설정 관리
 * - 서버 설정 조회 및 수정
 */

import { Request, Response } from 'express';
import { loadSettings, saveSettings } from '../config/index.js';
import {
  addOrUpdateServer,
  addServer,
  getServersInfo,
  notifyToolChanged,
  removeServer,
  syncToolEmbedding,
  toggleServerStatus,
} from '../services/mcpService.js';
import { syncAllServerToolsEmbeddings } from '../services/vectorSearchService.js';
import { AddServerRequest, ApiResponse } from '../types/index.js';
import { cleanupServerEnvVars } from '../utils/envVarCleanup.js';

/**
 * 모든 서버 정보 조회
 * 
 * 현재 등록된 모든 MCP 서버들의 상태, 도구 목록 등의 정보를 반환합니다.
 * 
 * @param {Request} _ - Express 요청 객체 (사용하지 않음)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 서버 정보 목록 또는 오류
 */
export const getAllServers = (_: Request, res: Response): void => {
  try {
    const serversInfo = getServersInfo();
    const response: ApiResponse = {
      success: true,
      data: serversInfo,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get servers information',
    });
  }
};

/**
 * 모든 설정 정보 조회
 * 
 * 시스템의 모든 설정 정보를 반환합니다.
 * 
 * @param {Request} _ - Express 요청 객체 (사용하지 않음)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 전체 설정 정보 또는 오류
 */
export const getAllSettings = (_: Request, res: Response): void => {
  try {
    const settings = loadSettings();
    const response: ApiResponse = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get server settings',
    });
  }
};

/**
 * 새 MCP 서버 생성
 * 
 * 새로운 MCP 서버를 설정에 추가하고 연결을 시도합니다.
 * 다양한 서버 타입(stdio, sse, streamable-http, openapi)을 지원합니다.
 * 
 * @param {Request} req - Express 요청 객체 (name, config 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 서버 생성 결과 또는 오류
 */
export const createServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, config } = req.body as AddServerRequest;

    // 서버 이름 유효성 검사
    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    // 서버 설정 유효성 검사
    if (!config || typeof config !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Server configuration is required',
      });
      return;
    }

    // 필수 설정 검사 (URL, OpenAPI 명세, 또는 명령어)
    if (
      !config.url &&
      !config.openapi?.url &&
      !config.openapi?.schema &&
      (!config.command || !config.args)
    ) {
      res.status(400).json({
        success: false,
        message:
          'Server configuration must include either a URL, OpenAPI specification URL or schema, or command with arguments',
      });
      return;
    }

    // 서버 타입 유효성 검사
    if (config.type && !['stdio', 'sse', 'streamable-http', 'openapi'].includes(config.type)) {
      res.status(400).json({
        success: false,
        message: 'Server type must be one of: stdio, sse, streamable-http, openapi',
      });
      return;
    }

    // SSE 및 StreamableHTTP 타입에 대한 URL 필수 검사
    if ((config.type === 'sse' || config.type === 'streamable-http') && !config.url) {
      res.status(400).json({
        success: false,
        message: `URL is required for ${config.type} server type`,
      });
      return;
    }

    // OpenAPI 타입에 대한 명세 URL 또는 스키마 필수 검사
    if (config.type === 'openapi' && !config.openapi?.url && !config.openapi?.schema) {
      res.status(400).json({
        success: false,
        message: 'OpenAPI specification URL or schema is required for openapi server type',
      });
      return;
    }

    // 헤더 유효성 검사
    if (config.headers && typeof config.headers !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Headers must be an object',
      });
      return;
    }

    // stdio 타입에서는 헤더 사용 불가 검사
    if (config.headers && config.type === 'stdio') {
      res.status(400).json({
        success: false,
        message: 'Headers are not supported for stdio server type',
      });
      return;
    }

    // SSE 서버에 대한 기본 keep-alive 간격 설정
    if ((config.type === 'sse' || (!config.type && config.url)) && !config.keepAliveInterval) {
      config.keepAliveInterval = 60000; // 기본값 60초
    }

    const result = await addServer(name, config);
    if (result.success) {
      // 도구 목록 변경 알림
      notifyToolChanged();
      res.json({
        success: true,
        message: 'Server added successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to add server',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * MCP 서버 삭제
 * 
 * 지정된 이름의 MCP 서버를 설정에서 제거하고 연결을 해제합니다.
 * 
 * @param {Request} req - Express 요청 객체 (name 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 서버 삭제 결과 또는 오류
 */
export const deleteServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    // 삭제 전에 서버 설정 정보 저장 (환경변수 정리용)
    const settings = loadSettings();
    const serverConfig = settings.mcpServers?.[name];

    const result = removeServer(name);
    if (result.success) {
      // 서버 제거 후 관련 환경변수들 정리
      if (serverConfig) {
        try {
          const cleanupResult = await cleanupServerEnvVars(name, serverConfig, false);
          console.log(`🧹 환경변수 정리 완료: ${cleanupResult.message}`);

          if (cleanupResult.affectedUsers > 0) {
            console.log(`   - 영향받은 사용자: ${cleanupResult.affectedUsers}명`);
            console.log(`   - 제거된 변수: ${cleanupResult.removedVars.join(', ')}`);
          }
        } catch (cleanupError) {
          console.warn(`⚠️  환경변수 정리 실패: ${cleanupError}`);
          // 환경변수 정리 실패해도 서버 삭제는 성공으로 처리
        }
      }

      // 도구 목록 변경 알림
      notifyToolChanged();
      res.json({
        success: true,
        message: 'Server removed successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'Server not found or failed to remove',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * MCP 서버 설정 업데이트
 * 
 * 기존 MCP 서버의 설정을 수정하고 연결을 재설정합니다.
 * 
 * @param {Request} req - Express 요청 객체 (name 매개변수 및 config 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 서버 업데이트 결과 또는 오류
 */
export const updateServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const { config } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    if (!config || typeof config !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Server configuration is required',
      });
      return;
    }

    // createServer와 동일한 유효성 검사 로직
    if (
      !config.url &&
      !config.openapi?.url &&
      !config.openapi?.schema &&
      (!config.command || !config.args)
    ) {
      res.status(400).json({
        success: false,
        message:
          'Server configuration must include either a URL, OpenAPI specification URL or schema, or command with arguments',
      });
      return;
    }

    // 서버 타입 유효성 검사
    if (config.type && !['stdio', 'sse', 'streamable-http', 'openapi'].includes(config.type)) {
      res.status(400).json({
        success: false,
        message: 'Server type must be one of: stdio, sse, streamable-http, openapi',
      });
      return;
    }

    // SSE 및 StreamableHTTP 타입에 대한 URL 필수 검사
    if ((config.type === 'sse' || config.type === 'streamable-http') && !config.url) {
      res.status(400).json({
        success: false,
        message: `URL is required for ${config.type} server type`,
      });
      return;
    }

    // OpenAPI 타입에 대한 명세 필수 검사
    if (config.type === 'openapi' && !config.openapi?.url && !config.openapi?.schema) {
      res.status(400).json({
        success: false,
        message: 'OpenAPI specification URL or schema is required for openapi server type',
      });
      return;
    }

    // 헤더 유효성 검사
    if (config.headers && typeof config.headers !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Headers must be an object',
      });
      return;
    }

    // stdio 타입에서는 헤더 사용 불가 검사
    if (config.headers && config.type === 'stdio') {
      res.status(400).json({
        success: false,
        message: 'Headers are not supported for stdio server type',
      });
      return;
    }

    // SSE 서버에 대한 기본 keep-alive 간격 설정
    if ((config.type === 'sse' || (!config.type && config.url)) && !config.keepAliveInterval) {
      config.keepAliveInterval = 60000; // 기본값 60초
    }

    const result = await addOrUpdateServer(name, config, true); // 업데이트를 위해 덮어쓰기 허용
    if (result.success) {
      // 도구 목록 변경 알림
      notifyToolChanged();
      res.json({
        success: true,
        message: 'Server updated successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'Server not found or failed to update',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 특정 서버 설정 조회
 * 
 * 지정된 서버의 상세 설정 정보와 상태를 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (name 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 서버 설정 정보 또는 오류
 */
export const getServerConfig = (req: Request, res: Response): void => {
  try {
    const { name } = req.params;
    const settings = loadSettings();

    if (!settings.mcpServers || !settings.mcpServers[name]) {
      res.status(404).json({
        success: false,
        message: 'Server not found',
      });
      return;
    }

    const serverInfo = getServersInfo().find((s) => s.name === name);
    const serverConfig = settings.mcpServers[name];
    const response: ApiResponse = {
      success: true,
      data: {
        name,
        status: serverInfo ? serverInfo.status : 'disconnected',
        tools: serverInfo ? serverInfo.tools : [],
        config: serverConfig,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get server configuration',
    });
  }
};

/**
 * 서버 상태 토글 (활성화/비활성화)
 * 
 * 지정된 서버를 활성화하거나 비활성화합니다.
 * 
 * @param {Request} req - Express 요청 객체 (name 매개변수 및 enabled 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 서버 상태 변경 결과 또는 오류
 */
export const toggleServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const { enabled } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Enabled status must be a boolean',
      });
      return;
    }

    const result = await toggleServerStatus(name, enabled);
    if (result.success) {
      // 도구 목록 변경 알림
      notifyToolChanged();
      res.json({
        success: true,
        message: result.message || `Server ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'Server not found or failed to toggle status',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 특정 서버의 도구 상태 토글
 * 
 * 지정된 서버의 특정 도구를 활성화하거나 비활성화합니다.
 * 
 * @param {Request} req - Express 요청 객체 (serverName, toolName 매개변수 및 enabled 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 도구 상태 변경 결과 또는 오류
 */
export const toggleTool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverName, toolName } = req.params;
    const { enabled } = req.body;

    if (!serverName || !toolName) {
      res.status(400).json({
        success: false,
        message: 'Server name and tool name are required',
      });
      return;
    }

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Enabled status must be a boolean',
      });
      return;
    }

    const settings = loadSettings();
    if (!settings.mcpServers[serverName]) {
      res.status(404).json({
        success: false,
        message: 'Server not found',
      });
      return;
    }

    // 도구 설정이 없는 경우 초기화
    if (!settings.mcpServers[serverName].tools) {
      settings.mcpServers[serverName].tools = {};
    }

    // 도구의 활성화 상태 설정
    settings.mcpServers[serverName].tools![toolName] = { enabled };

    if (!saveSettings(settings)) {
      res.status(500).json({
        success: false,
        message: 'Failed to save settings',
      });
      return;
    }

    // 도구 목록 변경 알림
    notifyToolChanged();

    res.json({
      success: true,
      message: `Tool ${toolName} ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * 특정 서버의 도구 설명 업데이트
 * 
 * 지정된 서버의 특정 도구에 대한 사용자 정의 설명을 설정합니다.
 * 
 * @param {Request} req - Express 요청 객체 (serverName, toolName 매개변수 및 description 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 도구 설명 업데이트 결과 또는 오류
 */
export const updateToolDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverName, toolName } = req.params;
    const { description } = req.body;

    if (!serverName || !toolName) {
      res.status(400).json({
        success: false,
        message: 'Server name and tool name are required',
      });
      return;
    }

    if (typeof description !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Description must be a string',
      });
      return;
    }

    const settings = loadSettings();
    if (!settings.mcpServers[serverName]) {
      res.status(404).json({
        success: false,
        message: 'Server not found',
      });
      return;
    }

    // 도구 설정이 없는 경우 초기화
    if (!settings.mcpServers[serverName].tools) {
      settings.mcpServers[serverName].tools = {};
    }

    // 도구 설정이 없는 경우 기본값으로 생성
    if (!settings.mcpServers[serverName].tools![toolName]) {
      settings.mcpServers[serverName].tools![toolName] = { enabled: true };
    }

    // 도구 설명 설정
    settings.mcpServers[serverName].tools![toolName].description = description;

    if (!saveSettings(settings)) {
      res.status(500).json({
        success: false,
        message: 'Failed to save settings',
      });
      return;
    }

    // 도구 목록 변경 알림
    notifyToolChanged();

    // 벡터 임베딩 동기화 (검색 기능용)
    syncToolEmbedding(serverName, toolName);

    res.json({
      success: true,
      message: `Tool ${toolName} description updated successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateSystemConfig = (req: Request, res: Response): void => {
  try {
    const { routing, install, smartRouting } = req.body;

    if (
      (!routing ||
        (typeof routing.enableGlobalRoute !== 'boolean' &&
          typeof routing.enableGroupNameRoute !== 'boolean' &&
          typeof routing.enableBearerAuth !== 'boolean' &&
          typeof routing.bearerAuthKey !== 'string' &&
          typeof routing.skipAuth !== 'boolean')) &&
      (!install ||
        (typeof install.pythonIndexUrl !== 'string' && typeof install.npmRegistry !== 'string')) &&
      (!smartRouting ||
        (typeof smartRouting.enabled !== 'boolean' &&
          typeof smartRouting.dbUrl !== 'string' &&
          typeof smartRouting.openaiApiBaseUrl !== 'string' &&
          typeof smartRouting.openaiApiKey !== 'string' &&
          typeof smartRouting.openaiApiEmbeddingModel !== 'string'))
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid system configuration provided',
      });
      return;
    }

    const settings = loadSettings();
    if (!settings.systemConfig) {
      settings.systemConfig = {
        routing: {
          enableGlobalRoute: true,
          enableGroupNameRoute: true,
          enableBearerAuth: false,
          bearerAuthKey: '',
          skipAuth: false,
        },
        install: {
          pythonIndexUrl: '',
          npmRegistry: '',
        },
        smartRouting: {
          enabled: false,
          dbUrl: '',
          openaiApiBaseUrl: '',
          openaiApiKey: '',
          openaiApiEmbeddingModel: '',
        },
      };
    }

    if (!settings.systemConfig.routing) {
      settings.systemConfig.routing = {
        enableGlobalRoute: true,
        enableGroupNameRoute: true,
        enableBearerAuth: false,
        bearerAuthKey: '',
        skipAuth: false,
      };
    }

    if (!settings.systemConfig.install) {
      settings.systemConfig.install = {
        pythonIndexUrl: '',
        npmRegistry: '',
      };
    }

    if (!settings.systemConfig.smartRouting) {
      settings.systemConfig.smartRouting = {
        enabled: false,
        dbUrl: '',
        openaiApiBaseUrl: '',
        openaiApiKey: '',
        openaiApiEmbeddingModel: '',
      };
    }

    if (routing) {
      if (typeof routing.enableGlobalRoute === 'boolean') {
        settings.systemConfig.routing.enableGlobalRoute = routing.enableGlobalRoute;
      }

      if (typeof routing.enableGroupNameRoute === 'boolean') {
        settings.systemConfig.routing.enableGroupNameRoute = routing.enableGroupNameRoute;
      }

      if (typeof routing.enableBearerAuth === 'boolean') {
        settings.systemConfig.routing.enableBearerAuth = routing.enableBearerAuth;
      }

      if (typeof routing.bearerAuthKey === 'string') {
        settings.systemConfig.routing.bearerAuthKey = routing.bearerAuthKey;
      }

      if (typeof routing.skipAuth === 'boolean') {
        settings.systemConfig.routing.skipAuth = routing.skipAuth;
      }
    }

    if (install) {
      if (typeof install.pythonIndexUrl === 'string') {
        settings.systemConfig.install.pythonIndexUrl = install.pythonIndexUrl;
      }
      if (typeof install.npmRegistry === 'string') {
        settings.systemConfig.install.npmRegistry = install.npmRegistry;
      }
    }

    // Track smartRouting state and configuration changes
    const wasSmartRoutingEnabled = settings.systemConfig.smartRouting.enabled || false;
    const previousSmartRoutingConfig = { ...settings.systemConfig.smartRouting };
    let needsSync = false;

    if (smartRouting) {
      if (typeof smartRouting.enabled === 'boolean') {
        // If enabling Smart Routing, validate required fields
        if (smartRouting.enabled) {
          const currentDbUrl = smartRouting.dbUrl || settings.systemConfig.smartRouting.dbUrl;
          const currentOpenaiApiKey =
            smartRouting.openaiApiKey || settings.systemConfig.smartRouting.openaiApiKey;

          if (!currentDbUrl || !currentOpenaiApiKey) {
            const missingFields = [];
            if (!currentDbUrl) missingFields.push('Database URL');
            if (!currentOpenaiApiKey) missingFields.push('OpenAI API Key');

            res.status(400).json({
              success: false,
              message: `Smart Routing requires the following fields: ${missingFields.join(', ')}`,
            });
            return;
          }
        }
        settings.systemConfig.smartRouting.enabled = smartRouting.enabled;
      }
      if (typeof smartRouting.dbUrl === 'string') {
        settings.systemConfig.smartRouting.dbUrl = smartRouting.dbUrl;
      }
      if (typeof smartRouting.openaiApiBaseUrl === 'string') {
        settings.systemConfig.smartRouting.openaiApiBaseUrl = smartRouting.openaiApiBaseUrl;
      }
      if (typeof smartRouting.openaiApiKey === 'string') {
        settings.systemConfig.smartRouting.openaiApiKey = smartRouting.openaiApiKey;
      }
      if (typeof smartRouting.openaiApiEmbeddingModel === 'string') {
        settings.systemConfig.smartRouting.openaiApiEmbeddingModel =
          smartRouting.openaiApiEmbeddingModel;
      }

      // Check if we need to sync embeddings
      const isNowEnabled = settings.systemConfig.smartRouting.enabled || false;
      const hasConfigChanged =
        previousSmartRoutingConfig.dbUrl !== settings.systemConfig.smartRouting.dbUrl ||
        previousSmartRoutingConfig.openaiApiBaseUrl !==
        settings.systemConfig.smartRouting.openaiApiBaseUrl ||
        previousSmartRoutingConfig.openaiApiKey !==
        settings.systemConfig.smartRouting.openaiApiKey ||
        previousSmartRoutingConfig.openaiApiEmbeddingModel !==
        settings.systemConfig.smartRouting.openaiApiEmbeddingModel;

      // Sync if: first time enabling OR smart routing is enabled and any config changed
      needsSync = (!wasSmartRoutingEnabled && isNowEnabled) || (isNowEnabled && hasConfigChanged);
    }

    if (saveSettings(settings)) {
      res.json({
        success: true,
        data: settings.systemConfig,
        message: 'System configuration updated successfully',
      });

      // If smart routing configuration changed, sync all existing server tools
      if (needsSync) {
        console.log('SmartRouting configuration changed - syncing all existing server tools...');
        // Run sync asynchronously to avoid blocking the response
        syncAllServerToolsEmbeddings().catch((error) => {
          console.error('Failed to sync server tools embeddings:', error);
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save system configuration',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
