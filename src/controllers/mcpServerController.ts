import { Request, Response } from 'express';
import { getDataSource } from '../db/index.js';
import { CreateMcpServerData, McpServerRepository, UpdateMcpServerData } from '../db/repositories/McpServerRepository.js';
import { UserApiKeyRepository } from '../db/repositories/UserApiKeyRepository.js';

class McpServerController {
    private mcpServerRepository: McpServerRepository;
    private userApiKeyRepository: UserApiKeyRepository;

    constructor() {
        const dataSource = getDataSource();
        this.mcpServerRepository = new McpServerRepository();
        this.userApiKeyRepository = new UserApiKeyRepository();
    }

    /**
     * 모든 MCP 서버 목록 조회
     */
    public async getAllMcpServers(req: Request, res: Response) {
        try {
            const servers = await this.mcpServerRepository.findAllWithEnvVars();

            res.json({
                success: true,
                data: servers
            });
        } catch (error: any) {
            console.error('Error fetching MCP servers:', error);
            res.status(500).json({
                success: false,
                error: error.message || '서버 목록을 가져오는 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 활성화된 MCP 서버 목록 조회
     */
    public async getEnabledMcpServers(req: Request, res: Response) {
        try {
            const servers = await this.mcpServerRepository.findEnabledServers();

            res.json({
                success: true,
                data: servers
            });
        } catch (error: any) {
            console.error('Error fetching enabled MCP servers:', error);
            res.status(500).json({
                success: false,
                error: error.message || '활성화된 서버 목록을 가져오는 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 특정 MCP 서버 조회
     */
    public async getMcpServer(req: Request, res: Response) {
        try {
            const { name } = req.params;
            const server = await this.mcpServerRepository.findByName(name);

            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'MCP 서버를 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                data: server
            });
        } catch (error: any) {
            console.error('Error fetching MCP server:', error);
            res.status(500).json({
                success: false,
                error: error.message || '서버 정보를 가져오는 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 새로운 MCP 서버 생성
     */
    public async createMcpServer(req: Request, res: Response) {
        try {
            const data: CreateMcpServerData = req.body;

            // 이름 중복 확인
            const existing = await this.mcpServerRepository.findByName(data.name);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'MCP server with this name already exists'
                });
            }

            const server = await this.mcpServerRepository.createServer(data);

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
    }

    /**
     * MCP 서버 업데이트
     */
    public async updateMcpServer(req: Request, res: Response) {
        try {
            const { name } = req.params;
            const data: UpdateMcpServerData = req.body;

            const server = await this.mcpServerRepository.updateServer(name, data);

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
    }

    /**
     * MCP 서버 삭제
     */
    public async deleteMcpServer(req: Request, res: Response) {
        try {
            const { name } = req.params;

            const success = await this.mcpServerRepository.deleteServer(name);

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
    }

    /**
     * MCP 서버 활성화/비활성화 토글
     */
    public async toggleMcpServer(req: Request, res: Response) {
        try {
            const { name } = req.params;

            const server = await this.mcpServerRepository.toggleServerStatus(name);

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
    }

    /**
     * 사용자별 MCP 서버 API 키 조회
     */
    public async getUserApiKeys(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            const { serverName } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const server = await this.mcpServerRepository.findByName(serverName);
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'MCP server not found'
                });
            }

            const apiKeys = await this.userApiKeyRepository.findByUserAndServer(userId, server.id);

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
    }

    /**
     * 사용자 API 키 설정
     */
    public async setUserApiKey(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            const { serverName } = req.params;
            const { varName, value } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const server = await this.mcpServerRepository.findByName(serverName);
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

            await this.userApiKeyRepository.setUserApiKey(userId, server.id, varName, value);

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
    }

    /**
     * 사용자 API 키 삭제
     */
    public async deleteUserApiKey(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            const { serverName } = req.params;
            const { varName } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const server = await this.mcpServerRepository.findByName(serverName);
            if (!server) {
                return res.status(404).json({
                    success: false,
                    error: 'MCP server not found'
                });
            }

            const success = await this.userApiKeyRepository.deleteApiKey(userId, server.id, varName);

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
    }
}

const mcpServerController = new McpServerController();

/**
 * 모든 MCP 서버 목록 조회
 */
export const getAllMcpServers = async (req: Request, res: Response) => {
    await mcpServerController.getAllMcpServers(req, res);
};

/**
 * 활성화된 MCP 서버 목록 조회
 */
export const getEnabledMcpServers = async (req: Request, res: Response) => {
    await mcpServerController.getEnabledMcpServers(req, res);
};

/**
 * 특정 MCP 서버 조회
 */
export const getMcpServer = async (req: Request, res: Response) => {
    await mcpServerController.getMcpServer(req, res);
};

/**
 * 새로운 MCP 서버 생성
 */
export const createMcpServer = async (req: Request, res: Response) => {
    await mcpServerController.createMcpServer(req, res);
};

/**
 * MCP 서버 업데이트
 */
export const updateMcpServer = async (req: Request, res: Response) => {
    await mcpServerController.updateMcpServer(req, res);
};

/**
 * MCP 서버 삭제
 */
export const deleteMcpServer = async (req: Request, res: Response) => {
    await mcpServerController.deleteMcpServer(req, res);
};

/**
 * MCP 서버 활성화/비활성화 토글
 */
export const toggleMcpServer = async (req: Request, res: Response) => {
    await mcpServerController.toggleMcpServer(req, res);
};

/**
 * 사용자별 MCP 서버 API 키 조회
 */
export const getUserApiKeys = async (req: Request, res: Response) => {
    await mcpServerController.getUserApiKeys(req, res);
};

/**
 * 사용자 API 키 설정
 */
export const setUserApiKey = async (req: Request, res: Response) => {
    await mcpServerController.setUserApiKey(req, res);
};

/**
 * 사용자 API 키 삭제
 */
export const deleteUserApiKey = async (req: Request, res: Response) => {
    await mcpServerController.deleteUserApiKey(req, res);
}; 