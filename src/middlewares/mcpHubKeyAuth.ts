import { Request, Response, NextFunction } from 'express';
import { MCPHubKeyService } from '../services/mcpHubKeyService.js';

/**
 * MCPHub Key 인증 미들웨어
 * 요청에서 MCPHub Key를 추출하고 인증하여 사용자 정보를 요청 객체에 추가합니다.
 */
export const mcpHubKeyAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // MCPHub Key 추출 (헤더 또는 쿼리 파라미터에서)
    const headerKey = req.header('x-mcphub-key');
    const queryKey = req.query.mcphub_key as string;
    const bodyKey = (req.body as any)?.mcphub_key;
    
    const mcpHubKey = headerKey || queryKey || bodyKey;

    if (!mcpHubKey) {
      // MCPHub Key가 없어도 계속 진행 (선택적 인증)
      next();
      return;
    }

    // MCPHub Key 인증
    const mcpHubKeyService = new MCPHubKeyService();
    const authResult = await mcpHubKeyService.authenticateKey(mcpHubKey);

    if (!authResult) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired MCPHub key' 
      });
      return;
    }

    // 인증된 사용자 정보를 요청 객체에 추가
    (req as any).mcpHubUser = authResult.user;
    (req as any).mcpHubKey = mcpHubKey;
    (req as any).serviceTokens = authResult.serviceTokens;

    console.log(`🔐 MCPHub Key 인증 성공: ${authResult.user.githubUsername}`);

    next();
  } catch (error) {
    console.error('MCPHub Key 인증 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during key authentication' 
    });
  }
};

/**
 * 필수 MCPHub Key 인증 미들웨어
 * MCPHub Key가 반드시 있어야 하는 엔드포인트에서 사용
 */
export const requireMcpHubKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const headerKey = req.header('x-mcphub-key');
    const queryKey = req.query.mcphub_key as string;
    const bodyKey = (req.body as any)?.mcphub_key;
    
    const mcpHubKey = headerKey || queryKey || bodyKey;

    if (!mcpHubKey) {
      res.status(401).json({ 
        success: false, 
        message: 'MCPHub key is required' 
      });
      return;
    }

    const mcpHubKeyService = new MCPHubKeyService();
    const authResult = await mcpHubKeyService.authenticateKey(mcpHubKey);

    if (!authResult) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired MCPHub key' 
      });
      return;
    }

    (req as any).mcpHubUser = authResult.user;
    (req as any).mcpHubKey = mcpHubKey;
    (req as any).serviceTokens = authResult.serviceTokens;

    next();
  } catch (error) {
    console.error('MCPHub Key 인증 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during key authentication' 
    });
  }
}; 