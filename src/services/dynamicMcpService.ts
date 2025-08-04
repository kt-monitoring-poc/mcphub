import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { UserToken } from '../db/entities/UserToken.js';
import { AppDataSource } from '../db/connection.js';
import { Repository } from 'typeorm';

interface UserMcpServer {
  client: Client;
  process: ChildProcess;
  transport: StdioClientTransport;
  isConnected: boolean;
  lastActivity: Date;
}

export class DynamicMcpService {
  private static instance: DynamicMcpService;
  private userServers: Map<string, UserMcpServer> = new Map();
  private userTokenRepository: Repository<UserToken>;
  private encryptionKey: string;

  private constructor() {
    this.userTokenRepository = AppDataSource.getRepository(UserToken);
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'mcphub-default-key-2024';
    
    // 30분마다 비활성 서버 정리
    setInterval(() => this.cleanupInactiveServers(), 30 * 60 * 1000);
  }

  public static getInstance(): DynamicMcpService {
    if (!DynamicMcpService.instance) {
      DynamicMcpService.instance = new DynamicMcpService();
    }
    return DynamicMcpService.instance;
  }

  /**
   * 토큰 암호화
   */
  private encryptToken(token: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const iv = randomBytes(16);
    
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 토큰 복호화
   */
  private decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * 사용자 GitHub 토큰 저장
   */
  async saveUserGithubToken(userId: string, token: string, tokenName?: string): Promise<void> {
    try {
      // 기존 토큰 확인
      let userToken = await this.userTokenRepository.findOne({
        where: { userId, tokenType: 'github' }
      });

      const encryptedToken = this.encryptToken(token);

      if (userToken) {
        // 기존 토큰 업데이트
        userToken.encryptedToken = encryptedToken;
        userToken.tokenName = tokenName || userToken.tokenName;
        userToken.isActive = true;
        userToken.updatedAt = new Date();
      } else {
        // 새 토큰 생성
        userToken = this.userTokenRepository.create({
          userId,
          tokenType: 'github',
          encryptedToken,
          tokenName: tokenName || 'GitHub Personal Access Token',
          isActive: true
        });
      }

      await this.userTokenRepository.save(userToken);
      console.log(`[DynamicMcpService] GitHub 토큰 저장 완료: ${userId}`);
    } catch (error) {
      console.error(`[DynamicMcpService] GitHub 토큰 저장 실패:`, error);
      throw error;
    }
  }

  /**
   * 사용자 GitHub 토큰 조회
   */
  async getUserGithubToken(userId: string): Promise<string | null> {
    try {
      const userToken = await this.userTokenRepository.findOne({
        where: { userId, tokenType: 'github', isActive: true }
      });

      if (!userToken) {
        return null;
      }

      userToken.lastUsed = new Date();
      await this.userTokenRepository.save(userToken);

      return this.decryptToken(userToken.encryptedToken);
    } catch (error) {
      console.error(`[DynamicMcpService] GitHub 토큰 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 사용자별 GitHub MCP 서버 시작
   */
  async startUserGithubServer(userId: string): Promise<boolean> {
    try {
      // 이미 실행 중인 서버가 있는지 확인
      if (this.userServers.has(userId)) {
        const server = this.userServers.get(userId)!;
        if (server.isConnected) {
          server.lastActivity = new Date();
          console.log(`[DynamicMcpService] 사용자 ${userId}의 GitHub MCP 서버가 이미 실행 중입니다.`);
          return true;
        } else {
          // 연결이 끊어진 서버 정리
          this.stopUserGithubServer(userId);
        }
      }

      // GitHub 토큰 조회
      const githubToken = await this.getUserGithubToken(userId);
      if (!githubToken) {
        console.log(`[DynamicMcpService] 사용자 ${userId}의 GitHub 토큰이 없습니다.`);
        return false;
      }

      // GitHub MCP 서버 프로세스 시작
      const args = [
        'run',
        '-i',
        '--rm',
        '-e',
        'GITHUB_PERSONAL_ACCESS_TOKEN',
        '-e',
        'GITHUB_TOOLSETS',
        '-e',
        'GITHUB_READ_ONLY',
        'ghcr.io/github/github-mcp-server'
      ];

      const childProcess = spawn('docker', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
          GITHUB_TOOLSETS: '',
          GITHUB_READ_ONLY: ''
        }
      });

      // Transport 및 Client 설정
      const transport = new StdioClientTransport({
        command: 'docker',
        args,
        env: {
          ...process.env,
          GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
          GITHUB_TOOLSETS: '',
          GITHUB_READ_ONLY: ''
        }
      });

      const client = new Client(
        {
          name: `mcphub-user-${userId}`,
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // 연결
      await client.connect(transport);

      const server: UserMcpServer = {
        client,
        process: childProcess,
        transport,
        isConnected: true,
        lastActivity: new Date()
      };

      this.userServers.set(userId, server);

      // 프로세스 종료 핸들러
      childProcess.on('close', (code: number | null) => {
        console.log(`[DynamicMcpService] 사용자 ${userId}의 GitHub MCP 서버가 종료되었습니다. 코드: ${code}`);
        this.userServers.delete(userId);
      });

      console.log(`[DynamicMcpService] 사용자 ${userId}의 GitHub MCP 서버가 시작되었습니다.`);
      return true;

    } catch (error) {
      console.error(`[DynamicMcpService] 사용자 ${userId}의 GitHub MCP 서버 시작 실패:`, error);
      return false;
    }
  }

  /**
   * 사용자별 GitHub MCP 서버 중지
   */
  async stopUserGithubServer(userId: string): Promise<void> {
    try {
      const server = this.userServers.get(userId);
      if (!server) {
        return;
      }

      // 클라이언트 연결 종료
      if (server.client && server.isConnected) {
        await server.client.close();
      }

      // 프로세스 종료
      if (server.process && !server.process.killed) {
        server.process.kill('SIGTERM');
        
        // 5초 후에도 살아있으면 강제 종료
        setTimeout(() => {
          if (!server.process.killed) {
            server.process.kill('SIGKILL');
          }
        }, 5000);
      }

      this.userServers.delete(userId);
      console.log(`[DynamicMcpService] 사용자 ${userId}의 GitHub MCP 서버가 중지되었습니다.`);

    } catch (error) {
      console.error(`[DynamicMcpService] 사용자 ${userId}의 GitHub MCP 서버 중지 실패:`, error);
    }
  }

  /**
   * 사용자의 GitHub MCP 클라이언트 조회
   */
  getUserGithubClient(userId: string): Client | null {
    const server = this.userServers.get(userId);
    return server?.isConnected ? server.client : null;
  }

  /**
   * 사용자 GitHub 토큰 삭제
   */
  async deleteUserGithubToken(userId: string): Promise<void> {
    try {
      // MCP 서버 중지
      await this.stopUserGithubServer(userId);

      // 토큰 비활성화
      await this.userTokenRepository.update(
        { userId, tokenType: 'github' },
        { isActive: false, updatedAt: new Date() }
      );

      console.log(`[DynamicMcpService] 사용자 ${userId}의 GitHub 토큰이 삭제되었습니다.`);
    } catch (error) {
      console.error(`[DynamicMcpService] 사용자 ${userId}의 GitHub 토큰 삭제 실패:`, error);
      throw error;
    }
  }

  /**
   * 비활성 서버 정리 (30분 이상 미사용)
   */
  private async cleanupInactiveServers(): Promise<void> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    for (const [userId, server] of this.userServers.entries()) {
      if (server.lastActivity < thirtyMinutesAgo) {
        console.log(`[DynamicMcpService] 비활성 서버 정리: ${userId}`);
        await this.stopUserGithubServer(userId);
      }
    }
  }

  /**
   * 사용자의 GitHub 토큰 존재 여부 확인
   */
  async hasUserGithubToken(userId: string): Promise<boolean> {
    try {
      const userToken = await this.userTokenRepository.findOne({
        where: { userId, tokenType: 'github', isActive: true }
      });
      return !!userToken;
    } catch (error) {
      console.error(`[DynamicMcpService] GitHub 토큰 존재 확인 실패:`, error);
      return false;
    }
  }

  /**
   * 서버 상태 조회
   */
  getServerStatus(userId: string): { isRunning: boolean; lastActivity?: Date } {
    const server = this.userServers.get(userId);
    return {
      isRunning: server?.isConnected || false,
      lastActivity: server?.lastActivity
    };
  }
} 