import { loadSettings } from '../config/index.js';
import { extractUserEnvVars } from '../utils/variableDetection.js';
import { ensureServerConnected } from './mcpService.js';

type UpstreamKey = string; // serverName:contextKey

interface CursorSessionInfo {
    sessionId: string;
    group?: string;
    userServiceTokens?: Record<string, string>;
    upstreamKeys: Set<UpstreamKey>;
    createdAt: number;
    lastActivity: number;
}

// 업스트림은 길게 유지한다: 여기서는 상태 메타만 보관(실제 Client는 mcpService.serverInfos에서 유지)
interface UpstreamMeta {
    serverName: string;
    contextKey: string; // 'shared' | hash(userTokens)
    createdAt: number;
    lastActivity: number;
}

const cursorSessions: Map<string, CursorSessionInfo> = new Map();
const upstreamMetas: Map<UpstreamKey, UpstreamMeta> = new Map();

const getContextKey = (tokens?: Record<string, string>): string => {
    if (!tokens || Object.keys(tokens).length === 0) return 'shared';
    // 간단한 해시(빠름): 키 이름들을 정렬하여 조인
    const keys = Object.keys(tokens).sort();
    return 'tok:' + keys.join('|');
};

export const SessionManager = {
    getOrCreateCursorSession(sessionId: string, group?: string, tokens?: Record<string, string>): CursorSessionInfo {
        const existing = cursorSessions.get(sessionId);
        if (existing) {
            if (group !== undefined) existing.group = group;
            if (tokens && Object.keys(tokens).length > 0) existing.userServiceTokens = tokens;
            existing.lastActivity = Date.now();
            return existing;
        }
        const created: CursorSessionInfo = {
            sessionId,
            group,
            userServiceTokens: tokens,
            upstreamKeys: new Set<UpstreamKey>(),
            createdAt: Date.now(),
            lastActivity: Date.now(),
        };
        cursorSessions.set(sessionId, created);
        return created;
    },

    markActivity(sessionId: string): void {
        const s = cursorSessions.get(sessionId);
        if (s) s.lastActivity = Date.now();
    },

    async ensureAllUpstreamConnected(sessionId: string): Promise<void> {
        const s = cursorSessions.get(sessionId);
        if (!s) return;

        const settings = loadSettings();
        const enabledServers = Object.entries(settings.mcpServers).filter(([_, conf]) => conf.enabled !== false);
        const contextKey = getContextKey(s.userServiceTokens);

        for (const [serverName, conf] of enabledServers) {
            const needsTokens = extractUserEnvVars(conf).length > 0;
            // 업스트림 메타 등록 (실제 연결은 mcpService.ensureServerConnected가 담당)
            const key: UpstreamKey = `${serverName}:${needsTokens ? contextKey : 'shared'}`;
            if (!upstreamMetas.has(key)) {
                upstreamMetas.set(key, {
                    serverName,
                    contextKey: needsTokens ? contextKey : 'shared',
                    createdAt: Date.now(),
                    lastActivity: Date.now(),
                });
            } else {
                const meta = upstreamMetas.get(key)!;
                meta.lastActivity = Date.now();
            }
            s.upstreamKeys.add(key);

            // 연결 보장: 토큰 필요 시 사용자 토큰 사용, 아니면 공유 연결
            if (needsTokens) {
                await ensureServerConnected(serverName, s.userServiceTokens || {});
            } else {
                await ensureServerConnected(serverName, {});
            }
        }
    },
};

export default SessionManager;



