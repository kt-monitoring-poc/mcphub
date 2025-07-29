import { McpServer } from '../entities/McpServer.js';
import { McpServerEnvVar } from '../entities/McpServerEnvVar.js';
import { BaseRepository } from './BaseRepository.js';

export interface CreateMcpServerData {
    name: string;
    displayName: string;
    description?: string;
    type: 'stdio' | 'streamable-http' | 'sse';
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
    groupName?: string;
    sortOrder?: number;
    isBuiltIn?: boolean;
    enabled?: boolean;
    environmentVariables?: Array<{
        varName: string;
        displayName: string;
        description?: string;
        required?: boolean;
        isSecret?: boolean;
        defaultValue?: string;
        validationRegex?: string;
        sortOrder?: number;
    }>;
}

export interface UpdateMcpServerData {
    displayName?: string;
    description?: string;
    type?: 'stdio' | 'streamable-http' | 'sse';
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
    enabled?: boolean;
    groupName?: string;
    sortOrder?: number;
}

export class McpServerRepository extends BaseRepository<McpServer> {
    constructor() {
        super(McpServer);
    }

    async findByName(name: string): Promise<McpServer | null> {
        return this.repository.findOne({
            where: { name },
            relations: ['environmentVariables']
        });
    }

    async findAllWithEnvVars(): Promise<McpServer[]> {
        return this.repository.find({
            relations: ['environmentVariables'],
            order: {
                sortOrder: 'ASC',
                name: 'ASC'
            }
        });
    }

    async findEnabledServers(): Promise<McpServer[]> {
        return this.repository.find({
            where: { enabled: true },
            relations: ['environmentVariables'],
            order: {
                sortOrder: 'ASC',
                name: 'ASC'
            }
        });
    }

    async findByGroup(groupName: string): Promise<McpServer[]> {
        return this.repository.find({
            where: { groupName },
            relations: ['environmentVariables'],
            order: {
                sortOrder: 'ASC',
                name: 'ASC'
            }
        });
    }

    async createServer(data: CreateMcpServerData): Promise<McpServer> {
        const server = this.repository.create({
            name: data.name,
            displayName: data.displayName,
            description: data.description,
            type: data.type,
            command: data.command,
            args: data.args,
            url: data.url,
            headers: data.headers,
            enabled: data.enabled ?? true,
            groupName: data.groupName,
            sortOrder: data.sortOrder ?? 0,
            isBuiltIn: data.isBuiltIn ?? false
        });

        const savedServer = await this.repository.save(server);

        // Create environment variables if provided
        if (data.environmentVariables && data.environmentVariables.length > 0) {
            const envVarRepository = this.repository.manager.getRepository(McpServerEnvVar);
            const envVars = data.environmentVariables.map((envVar, index) =>
                envVarRepository.create({
                    serverId: savedServer.id,
                    varName: envVar.varName,
                    displayName: envVar.displayName,
                    description: envVar.description,
                    required: envVar.required ?? true,
                    isSecret: envVar.isSecret ?? true,
                    defaultValue: envVar.defaultValue,
                    validationRegex: envVar.validationRegex,
                    sortOrder: envVar.sortOrder ?? index
                })
            );

            await envVarRepository.save(envVars);
        }

        return this.findByName(savedServer.name) as Promise<McpServer>;
    }

    async updateServer(name: string, data: UpdateMcpServerData): Promise<McpServer | null> {
        const server = await this.findByName(name);
        if (!server) {
            return null;
        }

        Object.assign(server, data);
        await this.repository.save(server);

        return this.findByName(name);
    }

    async deleteServer(name: string): Promise<boolean> {
        const server = await this.findByName(name);
        if (!server) {
            return false;
        }

        // Prevent deletion of built-in servers
        if (server.isBuiltIn) {
            throw new Error('Cannot delete built-in server');
        }

        await this.repository.remove(server);
        return true;
    }

    async toggleServerStatus(name: string): Promise<McpServer | null> {
        const server = await this.findByName(name);
        if (!server) {
            return null;
        }

        server.enabled = !server.enabled;
        await this.repository.save(server);

        return server;
    }
} 