/**
 * JSON 설정을 DB로 마이그레이션하는 스크립트
 * 
 * mcp_settings.json의 서버 설정을 데이터베이스로 이관합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { closeDatabase, getDataSource, initializeDatabase } from '../db/index.js';
import { McpServerRepository } from '../db/repositories/McpServerRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface JsonServerConfig {
    type: 'stdio' | 'streamable-http' | 'sse';
    url?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    headers?: Record<string, string>;
    name?: string;
    description?: string;
    group?: string;
    enabled?: boolean;
}

interface JsonSettings {
    mcpServers: Record<string, JsonServerConfig>;
    users: any[];
}

async function migrateJsonToDb() {
    try {
        console.log('🔄 JSON → DB 마이그레이션 시작...');

        // 데이터베이스 연결
        await initializeDatabase();
        const dataSource = getDataSource();
        const mcpServerRepo = new McpServerRepository();

        // JSON 설정 파일 읽기
        const settingsPath = path.resolve(__dirname, '../../mcp_settings.json');

        if (!fs.existsSync(settingsPath)) {
            console.error('❌ mcp_settings.json 파일을 찾을 수 없습니다.');
            return;
        }

        const jsonData: JsonSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        console.log(`📋 ${Object.keys(jsonData.mcpServers).length}개의 서버 설정을 발견했습니다.`);

        // 기존 서버 데이터 확인
        const existingServers = await mcpServerRepo.findAll();
        if (existingServers.length > 0) {
            console.log(`⚠️  DB에 이미 ${existingServers.length}개의 서버가 있습니다. 마이그레이션을 건너뜁니다.`);
            return;
        }

        // 각 서버 설정을 DB로 마이그레이션
        for (const [serverName, config] of Object.entries(jsonData.mcpServers)) {
            console.log(`📥 서버 마이그레이션: ${serverName}`);

            const mcpServer = {
                name: serverName,
                displayName: config.name || serverName,
                description: config.description || `${serverName} MCP 서버`,
                type: config.type,
                command: config.command,
                args: config.args,
                url: config.url,
                headers: config.headers,
                enabled: config.enabled !== false, // 기본값 true
                groupName: config.group || 'default',
                sortOrder: 0,
                isBuiltIn: true, // JSON에서 마이그레이션된 서버는 빌트인으로 표시
                environmentVariables: [],
                userApiKeys: []
            };

            await mcpServerRepo.createServer(mcpServer);

            // 환경변수가 있으면 별도로 처리
            if (config.env) {
                for (const [varName, varValue] of Object.entries(config.env)) {
                    // 환경변수에 ${USER_*} 패턴이 있으면 동적 변수로 등록
                    if (varValue.includes('${USER_')) {
                        console.log(`  🔑 환경변수 발견: ${varName} = ${varValue}`);
                        // TODO: McpServerEnvVar로 등록
                    }
                }
            }
        }

        console.log('✅ JSON → DB 마이그레이션 완료!');
        console.log('💡 이제 서버를 재시작하면 DB에서 서버 설정을 로드합니다.');

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
    } finally {
        await closeDatabase();
    }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateJsonToDb();
}

export { migrateJsonToDb };
