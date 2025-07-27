import { Request, Response } from 'express';
import { DynamicMcpService } from '../services/dynamicMcpService.js';

export class UserTokenController {
  private dynamicMcpService: DynamicMcpService;

  constructor() {
    this.dynamicMcpService = DynamicMcpService.getInstance();
  }

  /**
   * GitHub 토큰 저장
   */
  saveGithubToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, tokenName } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'GitHub 토큰이 필요합니다.' });
        return;
      }

      // GitHub 토큰 유효성 검증 (간단한 패턴 체크)
      if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        res.status(400).json({ error: '유효하지 않은 GitHub 토큰 형식입니다.' });
        return;
      }

      // 토큰 저장
      await this.dynamicMcpService.saveUserGithubToken(userId, token, tokenName);

      // MCP 서버 시작 시도
      const serverStarted = await this.dynamicMcpService.startUserGithubServer(userId);

      res.json({
        success: true,
        message: 'GitHub 토큰이 저장되었습니다.',
        serverStarted,
        serverMessage: serverStarted 
          ? 'GitHub MCP 서버가 시작되었습니다.' 
          : 'GitHub MCP 서버 시작에 실패했습니다. 토큰을 확인해주세요.'
      });

    } catch (error) {
      console.error('[UserTokenController] GitHub 토큰 저장 실패:', error);
      res.status(500).json({ 
        error: '토큰 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  };

  /**
   * GitHub 토큰 상태 조회
   */
  getGithubTokenStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      const hasToken = await this.dynamicMcpService.hasUserGithubToken(userId);
      const serverStatus = this.dynamicMcpService.getServerStatus(userId);

      res.json({
        hasToken,
        serverStatus: {
          isRunning: serverStatus.isRunning,
          lastActivity: serverStatus.lastActivity
        }
      });

    } catch (error) {
      console.error('[UserTokenController] GitHub 토큰 상태 조회 실패:', error);
      res.status(500).json({ 
        error: '토큰 상태 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  };

  /**
   * GitHub MCP 서버 시작
   */
  startGithubServer = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      const hasToken = await this.dynamicMcpService.hasUserGithubToken(userId);
      if (!hasToken) {
        res.status(400).json({ 
          error: 'GitHub 토큰이 설정되지 않았습니다.',
          message: '먼저 GitHub Personal Access Token을 설정해주세요.'
        });
        return;
      }

      const serverStarted = await this.dynamicMcpService.startUserGithubServer(userId);

      if (serverStarted) {
        res.json({
          success: true,
          message: 'GitHub MCP 서버가 시작되었습니다.'
        });
      } else {
        res.status(500).json({
          error: 'GitHub MCP 서버 시작에 실패했습니다.',
          message: '토큰이 유효한지 확인해주세요.'
        });
      }

    } catch (error) {
      console.error('[UserTokenController] GitHub MCP 서버 시작 실패:', error);
      res.status(500).json({ 
        error: 'MCP 서버 시작 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  };

  /**
   * GitHub MCP 서버 중지
   */
  stopGithubServer = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      await this.dynamicMcpService.stopUserGithubServer(userId);

      res.json({
        success: true,
        message: 'GitHub MCP 서버가 중지되었습니다.'
      });

    } catch (error) {
      console.error('[UserTokenController] GitHub MCP 서버 중지 실패:', error);
      res.status(500).json({ 
        error: 'MCP 서버 중지 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  };

  /**
   * GitHub 토큰 삭제
   */
  deleteGithubToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      await this.dynamicMcpService.deleteUserGithubToken(userId);

      res.json({
        success: true,
        message: 'GitHub 토큰이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('[UserTokenController] GitHub 토큰 삭제 실패:', error);
      res.status(500).json({ 
        error: '토큰 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  };

  /**
   * GitHub 토큰 유효성 검증
   */
  validateGithubToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'GitHub 토큰이 필요합니다.' });
        return;
      }

      // GitHub API로 토큰 유효성 검증
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'MCPHub'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        res.json({
          valid: true,
          user: {
            login: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url
          }
        });
      } else {
        res.json({
          valid: false,
          error: 'GitHub 토큰이 유효하지 않거나 권한이 부족합니다.'
        });
      }

    } catch (error) {
      console.error('[UserTokenController] GitHub 토큰 검증 실패:', error);
      res.status(500).json({ 
        error: '토큰 검증 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  };
} 