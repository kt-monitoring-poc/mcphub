import { Request, Response } from 'express';
import passport from 'passport';
import { UserService } from '../services/userService.js';
import { MCPHubKeyService } from '../services/mcpHubKeyService.js';
import { User } from '../db/entities/User.js';

// Service 인스턴스
const userService = new UserService();
const mcpHubKeyService = new MCPHubKeyService();

/**
 * GitHub OAuth 로그인 시작
 */
export const initiateGithubLogin = (req: Request, res: Response) => {
  console.log('🚀 GitHub OAuth 로그인 시작');
  passport.authenticate('github', { 
    scope: ['user:email'] // 이메일 정보 요청
  })(req, res);
};

/**
 * GitHub OAuth 콜백 처리
 */
export const handleGithubCallback = (req: Request, res: Response) => {
  passport.authenticate('github', { 
    failureRedirect: '/login?error=oauth_failed',
    successRedirect: '/' 
  }, async (err: any, user: User) => {
    if (err) {
      console.error('❌ GitHub OAuth 콜백 오류:', err);
      return res.redirect('/login?error=oauth_error');
    }

    if (!user) {
      console.log('⚠️ GitHub OAuth: 사용자 정보 없음');
      return res.redirect('/login?error=no_user');
    }

    // 세션에 사용자 로그인 처리
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('❌ 세션 로그인 오류:', loginErr);
        return res.redirect('/login?error=session_error');
      }

      console.log(`✅ GitHub OAuth 로그인 성공: ${user.githubUsername}`);
      
      // 성공적으로 로그인 후 리다이렉트
      return res.redirect('/dashboard?welcome=true');
    });
  })(req, res);
};

/**
 * 로그아웃
 */
export const logout = (req: Request, res: Response) => {
  const user = req.user as User;
  if (user) {
    console.log(`👋 사용자 로그아웃: ${user.githubUsername}`);
  }

  req.logout((err) => {
    if (err) {
      console.error('❌ 로그아웃 오류:', err);
      return res.status(500).json({ 
        success: false, 
        message: '로그아웃 중 오류가 발생했습니다.' 
      });
    }

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('❌ 세션 삭제 오류:', sessionErr);
      }
      
      res.clearCookie('connect.sid');
      res.redirect('/login?logout=success');
    });
  });
};

/**
 * 현재 사용자 정보 조회
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 사용자 키 통계 조회
    const keyStats = await userService.getUserKeyUsageStats(user.id);

    const userData = {
      id: user.id,
      githubId: user.githubId,
      githubUsername: user.githubUsername,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      githubProfileUrl: user.githubProfileUrl,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      keyStats
    };

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('❌ 사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 사용자 MCPHub Key 목록 조회
 */
export const getUserKeys = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    const keys = await mcpHubKeyService.getUserKeys(user.id);
    
    // 키 값 마스킹 (보안)
    const maskedKeys = keys.map(key => ({
      ...key,
      keyValue: `${key.keyValue.substring(0, 12)}***${key.keyValue.substring(key.keyValue.length - 4)}`,
      user: undefined, // 사용자 정보 제거
      serviceTokens: key.serviceTokens ? Object.keys(key.serviceTokens) : [] // 토큰 키만 반환
    }));

    res.json({
      success: true,
      data: maskedKeys
    });
  } catch (error) {
    console.error('❌ 사용자 키 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '키 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 새 MCPHub Key 생성
 */
export const createUserKey = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '키 이름은 필수입니다.'
      });
    }

    const newKey = await mcpHubKeyService.createKey(user.id, {
      name: name.trim(),
      description: description?.trim()
    });

    res.status(201).json({
      success: true,
      message: '새 MCPHub Key가 생성되었습니다.',
      data: {
        id: newKey.id,
        keyValue: newKey.keyValue, // 생성 시에만 전체 키 반환
        name: newKey.name,
        description: newKey.description,
        expiresAt: newKey.expiresAt,
        daysUntilExpiry: newKey.daysUntilExpiry
      }
    });
  } catch (error) {
    console.error('❌ MCPHub Key 생성 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '키 생성 중 오류가 발생했습니다.'
    });
  }
};

/**
 * MCPHub Key 서비스 토큰 업데이트
 */
export const updateKeyTokens = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    const { keyId } = req.params;
    const { serviceTokens } = req.body;

    if (!serviceTokens || typeof serviceTokens !== 'object') {
      return res.status(400).json({
        success: false,
        message: '서비스 토큰 정보가 필요합니다.'
      });
    }

    const updatedKey = await mcpHubKeyService.updateServiceTokens(
      keyId, 
      serviceTokens, 
      user.id
    );

    res.json({
      success: true,
      message: '서비스 토큰이 업데이트되었습니다.',
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        serviceTokenKeys: Object.keys(updatedKey.serviceTokens || {})
      }
    });
  } catch (error) {
    console.error('❌ 서비스 토큰 업데이트 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '토큰 업데이트 중 오류가 발생했습니다.'
    });
  }
};

/**
 * MCPHub Key 만료 연장
 */
export const extendKeyExpiry = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    const { keyId } = req.params;

    const updatedKey = await mcpHubKeyService.extendKeyExpiry(keyId, user.id);

    res.json({
      success: true,
      message: '키 만료일이 90일 연장되었습니다.',
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        expiresAt: updatedKey.expiresAt,
        daysUntilExpiry: updatedKey.daysUntilExpiry
      }
    });
  } catch (error) {
    console.error('❌ 키 만료 연장 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '키 만료 연장 중 오류가 발생했습니다.'
    });
  }
};

/**
 * MCPHub Key 비활성화
 */
export const deactivateKey = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    const { keyId } = req.params;

    await mcpHubKeyService.setKeyActive(keyId, false, user.id);

    res.json({
      success: true,
      message: '키가 비활성화되었습니다.'
    });
  } catch (error) {
    console.error('❌ 키 비활성화 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '키 비활성화 중 오류가 발생했습니다.'
    });
  }
}; 