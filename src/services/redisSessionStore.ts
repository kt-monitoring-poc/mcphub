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
}

export default RedisSessionStore;


