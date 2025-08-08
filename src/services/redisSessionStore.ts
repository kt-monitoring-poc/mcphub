import * as IORedis from 'ioredis';

export interface UpstreamSessionKey {
    serverName: string;
    contextKey: string; // 'shared' | token-hash
}

export class RedisSessionStore {
    private static instance: RedisSessionStore | null = null;
    private client: any;

    private constructor() {
        const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        this.client = new (IORedis as any)(url);
    }

    public static getInstance(): RedisSessionStore {
        if (!this.instance) this.instance = new RedisSessionStore();
        return this.instance;
    }

    private keyOf({ serverName, contextKey }: UpstreamSessionKey): string {
        return `mcp:upstream:session:${serverName}:${contextKey}`;
    }

    async getSessionId(key: UpstreamSessionKey): Promise<string | null> {
        return this.client.get(this.keyOf(key));
    }

    async setSessionId(key: UpstreamSessionKey, sessionId: string, ttlSec = 3600): Promise<void> {
        await this.client.set(this.keyOf(key), sessionId, 'EX', ttlSec);
    }

    async deleteSessionId(key: UpstreamSessionKey): Promise<void> {
        await this.client.del(this.keyOf(key));
    }

  private parseKey(redisKey: string): UpstreamSessionKey | null {
    const parts = redisKey.split(':');
    if (parts.length < 5) return null;
    const serverName = parts[3];
    const contextKey = parts.slice(4).join(':');
    return { serverName, contextKey };
  }

  async listAll(): Promise<Array<{ serverName: string; contextKey: string; sessionId: string; ttl: number }>> {
    const results: Array<{ serverName: string; contextKey: string; sessionId: string; ttl: number }> = [];
    let cursor = '0';
    do {
      // SCAN to iterate keys without blocking Redis
      // eslint-disable-next-line no-await-in-loop
      const reply = await this.client.scan(cursor, 'MATCH', 'mcp:upstream:session:*', 'COUNT', 100);
      cursor = reply[0];
      const keys: string[] = reply[1] || [];
      if (keys.length === 0) continue;
      // eslint-disable-next-line no-await-in-loop
      const values = await this.client.mget(keys);
      // eslint-disable-next-line no-await-in-loop
      const ttls = await Promise.all(keys.map((k) => this.client.ttl(k)));
      keys.forEach((k, idx) => {
        const meta = this.parseKey(k);
        if (!meta) return;
        const sessionId = values[idx] || '';
        const ttl = ttls[idx] ?? -1;
        results.push({ serverName: meta.serverName, contextKey: meta.contextKey, sessionId, ttl });
      });
    } while (cursor !== '0');
    return results;
  }
}

export default RedisSessionStore;


