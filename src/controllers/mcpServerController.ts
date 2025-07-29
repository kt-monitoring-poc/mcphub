import { Request, Response } from 'express';
import { McpServer } from '../db/entities/McpServer.js';
import { UserApiKey } from '../db/entities/UserApiKey.js';
import { getDataSource } from '../db/index.js';
import { CreateMcpServerData, McpServerRepository, UpdateMcpServerData } from '../db/repositories/McpServerRepository.js';
import { UserApiKeyRepository } from '../db/repositories/UserApiKeyRepository.js';

let mcpServerRepository: McpServerRepository;
let userApiKeyRepository: UserApiKeyRepository;

// Initialize repositories
const initRepositories = async () => {
    if (!mcpServerRepository || !userApiKeyRepository) {
        const dataSource = await getDataSource();
        mcpServerRepository = new McpServerRepository(dataSource.getRepository(McpServer));
        userApiKeyRepository = new UserApiKeyRepository(dataSource.getRepository(UserApiKey));
    }
};

/**
 * 모든 MCP 서버 목록 조회
 */
export const getAllMcpServers = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const servers = await mcpServerRepository.findAllWithEnvVars();

        res.json({
            success: true,
            data: servers
        });
    } catch (error) {
        console.error('Error fetching MCP servers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch MCP servers'
        });
    }
};

/**
 * 활성화된 MCP 서버 목록 조회
 */
export const getEnabledMcpServers = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const servers = await mcpServerRepository.findEnabledServers();

        res.json({
            success: true,
            data: servers
        });
    } catch (error) {
        console.error('Error fetching enabled MCP servers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enabled MCP servers'
        });
    }
};

/**
 * 특정 MCP 서버 조회
 */
export const getMcpServer = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const { name } = req.params;
        const server = await mcpServerRepository.findByName(name);

        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'MCP server not found'
            });
        }

        res.json({
            success: true,
            data: server
        });
    } catch (error) {
        console.error('Error fetching MCP server:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch MCP server'
        });
    }
};

/**
 * 새로운 MCP 서버 생성
 */
export const createMcpServer = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const data: CreateMcpServerData = req.body;

        // 이름 중복 확인
        const existing = await mcpServerRepository.findByName(data.name);
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'MCP server with this name already exists'
            });
        }

        const server = await mcpServerRepository.createServer(data);

        res.status(201).json({
            success: true,
            data: server
        });
    } catch (error) {
        console.error('Error creating MCP server:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create MCP server'
        });
    }
};

/**
 * MCP 서버 업데이트
 */
export const updateMcpServer = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const { name } = req.params;
        const data: UpdateMcpServerData = req.body;

        const server = await mcpServerRepository.updateServer(name, data);

        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'MCP server not found'
            });
        }

        res.json({
            success: true,
            data: server
        });
    } catch (error) {
        console.error('Error updating MCP server:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update MCP server'
        });
    }
};

/**
 * MCP 서버 삭제
 */
export const deleteMcpServer = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const { name } = req.params;

        const success = await mcpServerRepository.deleteServer(name);

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'MCP server not found'
            });
        }

        res.json({
            success: true,
            message: 'MCP server deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting MCP server:', error);

        if (error instanceof Error && error.message === 'Cannot delete built-in server') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete built-in server'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to delete MCP server'
        });
    }
};

/**
 * MCP 서버 활성화/비활성화 토글
 */
export const toggleMcpServer = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const { name } = req.params;

        const server = await mcpServerRepository.toggleServerStatus(name);

        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'MCP server not found'
            });
        }

        res.json({
            success: true,
            data: server,
            message: `MCP server ${server.enabled ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        console.error('Error toggling MCP server:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle MCP server'
        });
    }
};

/**
 * 사용자별 MCP 서버 API 키 조회
 */
export const getUserApiKeys = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const userId = (req as any).user?.id;
        const { serverName } = req.params;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        const server = await mcpServerRepository.findByName(serverName);
        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'MCP server not found'
            });
        }

        const apiKeys = await userApiKeyRepository.findByUserAndServer(userId, server.id);

        // API 키 값을 숨기고 환경변수 정보만 반환
        const response = server.environmentVariables.map(envVar => {
            const userKey = apiKeys.find(key => key.varName === envVar.varName);
            return {
                varName: envVar.varName,
                displayName: envVar.displayName,
                description: envVar.description,
                required: envVar.required,
                isSecret: envVar.isSecret,
                hasValue: !!userKey,
                sortOrder: envVar.sortOrder
            };
        });

        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error fetching user API keys:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch API keys'
        });
    }
};

/**
 * 사용자 API 키 설정
 */
export const setUserApiKey = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const userId = (req as any).user?.id;
        const { serverName } = req.params;
        const { varName, value } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        const server = await mcpServerRepository.findByName(serverName);
        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'MCP server not found'
            });
        }

        // 해당 환경변수가 서버에 정의되어 있는지 확인
        const envVar = server.environmentVariables.find(env => env.varName === varName);
        if (!envVar) {
            return res.status(400).json({
                success: false,
                error: 'Environment variable not defined for this server'
            });
        }

        // 필수 필드 유효성 검사
        if (envVar.required && (!value || value.trim() === '')) {
            return res.status(400).json({
                success: false,
                error: 'Value is required for this environment variable'
            });
        }

        // 정규식 유효성 검사
        if (envVar.validationRegex && value) {
            const regex = new RegExp(envVar.validationRegex);
            if (!regex.test(value)) {
                return res.status(400).json({
                    success: false,
                    error: 'Value does not match the required format'
                });
            }
        }

        await userApiKeyRepository.setUserApiKey(userId, server.id, varName, value);

        res.json({
            success: true,
            message: 'API key saved successfully'
        });
    } catch (error) {
        console.error('Error setting user API key:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save API key'
        });
    }
};

/**
 * 사용자 API 키 삭제
 */
export const deleteUserApiKey = async (req: Request, res: Response) => {
    try {
        await initRepositories();
        const userId = (req as any).user?.id;
        const { serverName } = req.params;
        const { varName } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        const server = await mcpServerRepository.findByName(serverName);
        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'MCP server not found'
            });
        }

        const success = await userApiKeyRepository.deleteApiKey(userId, server.id, varName);

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'API key not found'
            });
        }

        res.json({
            success: true,
            message: 'API key deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user API key:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete API key'
        });
    }
}; 