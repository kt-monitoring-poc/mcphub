import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { User } from '../db/entities/User.js';
import { MCPHubKeyService } from '../services/mcpHubKeyService.js';
import { UserService } from '../services/userService.js';

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
export const handleGithubCallback = async (req: Request, res: Response) => {
  console.log('🔍 OAuth 콜백 성공 - 사용자 처리 시작');

  const user = req.user as User;

  if (!user) {
    console.log('⚠️ OAuth 성공했지만 사용자 정보 없음');
    return res.redirect('/login?error=no_user');
  }

  try {
    console.log(`✅ GitHub OAuth 로그인 성공: ${user.githubUsername}`);
    console.log(`🔍 사용자 정보 상세:`, {
      id: user.id,
      githubUsername: user.githubUsername,
      isAdmin: user.isAdmin,
      isAdminType: typeof user.isAdmin,
      githubId: user.githubId,
      email: user.email
    });

    // JWT 토큰 생성
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

    const payload = {
      user: {
        id: user.id,
        username: user.githubUsername,
        isAdmin: user.isAdmin || false,
        githubId: user.githubId,
        email: user.email
      }
    };

    console.log(`🔍 JWT Payload:`, payload);

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    console.log(`🔑 JWT 토큰 생성 완료 (${user.githubUsername}): ${token.substring(0, 50)}...`);

    // 세션 제거 - JWT만 사용
    req.logout((err) => {
      if (err) console.log('세션 로그아웃 오류:', err);
    });

    // 단순한 302 리다이렉트 사용
    const redirectUrl = `/?welcome=true&token=${encodeURIComponent(token)}`;
    console.log(`🔄 302 리다이렉트: ${redirectUrl.substring(0, 100)}...`);

    return res.redirect(302, redirectUrl);
  } catch (error) {
    console.error('❌ JWT 토큰 생성 오류:', error);
    return res.redirect('/login?error=token_error');
  }
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
/**
 * 키 복사를 위한 전체 키 값 조회
 */
export const getFullKeyValue = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    const keyId = req.params.keyId;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증되지 않은 사용자입니다.'
      });
    }

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: '키 ID가 필요합니다.'
      });
    }

    // 해당 키가 사용자 소유인지 확인
    const userKeys = await mcpHubKeyService.getUserKeys(user.id);
    const requestedKey = userKeys.find(key => key.id === keyId);

    if (!requestedKey) {
      return res.status(404).json({
        success: false,
        message: '키를 찾을 수 없거나 권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        keyValue: requestedKey.keyValue
      }
    });
  } catch (error) {
    console.error('Get full key value error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const getUserKeys = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증되지 않은 사용자입니다.'
      });
    }

    // 관리자인 경우 모든 사용자의 키를 조회
    if (user.isAdmin) {
      const allKeys = await mcpHubKeyService.getAllUserKeys();

      // 키 값 마스킹 (보안) 및 만료일 계산
      const maskedKeys = allKeys.map(key => {
        // 만료일까지 남은 일수 계산
        const now = new Date();
        const expiresAt = new Date(key.expiresAt);
        const timeDiff = expiresAt.getTime() - now.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

        return {
          ...key,
          keyValue: `${key.keyValue.substring(0, 12)}***${key.keyValue.substring(key.keyValue.length - 4)}`,
          // 관리자용으로 사용자 정보 포함
          user: {
            id: key.user.id,
            githubUsername: key.user.githubUsername,
            displayName: key.user.displayName,
            isAdmin: key.user.isAdmin
          },
          serviceTokens: key.serviceTokens ? Object.keys(key.serviceTokens) : [], // 토큰 키만 반환
          daysUntilExpiry: daysUntilExpiry
        };
      });

      res.json({
        success: true,
        data: maskedKeys,
        isAdminView: true
      });
    } else {
      // 일반 사용자는 자신의 키만 조회
      const keys = await mcpHubKeyService.getUserKeys(user.id);

      // 키 값 마스킹 (보안) 및 만료일 계산
      const maskedKeys = keys.map(key => {
        // 만료일까지 남은 일수 계산
        const now = new Date();
        const expiresAt = new Date(key.expiresAt);
        const timeDiff = expiresAt.getTime() - now.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

        return {
          ...key,
          keyValue: `${key.keyValue.substring(0, 12)}***${key.keyValue.substring(key.keyValue.length - 4)}`,
          user: undefined, // 사용자 정보 제거
          serviceTokens: key.serviceTokens ? Object.keys(key.serviceTokens) : [], // 토큰 키만 반환
          daysUntilExpiry: daysUntilExpiry
        };
      });

      res.json({
        success: true,
        data: maskedKeys,
        isAdminView: false
      });
    }
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

    // 키 이름을 고정으로 설정
    const keyName = 'MCPHub Key';
    const description = 'Cursor IDE에서 사용할 MCPHub Key입니다.';

    // 만료일 설정 (1-90일, 기본값: 90일)
    const { expiryDays } = req.body;
    let days = 90; // 기본값

    if (expiryDays !== undefined) {
      const parsedDays = parseInt(expiryDays);
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 90) {
        return res.status(400).json({
          success: false,
          message: '만료일은 1일에서 90일 사이여야 합니다.'
        });
      }
      days = parsedDays;
    }

    const newKey = await mcpHubKeyService.createKey(user.id, {
      name: keyName,
      description: description,
      expiryDays: days
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
 * 특정 키의 전체 키값 조회 (복사용)
 */
export const getKeyValue = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증되지 않은 사용자입니다.'
      });
    }

    const { keyId } = req.params;

    // 사용자의 키인지 확인
    const keys = await mcpHubKeyService.getUserKeys(user.id);
    const key = keys.find(k => k.id === keyId);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: '키를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        keyValue: key.keyValue
      }
    });
  } catch (error) {
    console.error('❌ 키값 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '키값 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 특정 키의 서비스 토큰 조회
 */
export const getKeyTokens = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증되지 않은 사용자입니다.'
      });
    }

    const { keyId } = req.params;

    // 사용자의 키인지 확인
    const keys = await mcpHubKeyService.getUserKeys(user.id);
    const key = keys.find(k => k.id === keyId);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: '키를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        serviceTokens: key.serviceTokens || {}
      }
    });
  } catch (error) {
    console.error('❌ 서비스 토큰 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서비스 토큰 조회 중 오류가 발생했습니다.'
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
    const serviceTokens = req.body; // 직접 body를 사용 (중첩된 serviceTokens 제거)

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

    // API Keys가 업데이트되면 관련 MCP 서버들을 재시작
    if (Object.keys(serviceTokens).length > 0) {
      try {

        // GitHub 토큰이 있으면 github 서버 재시작
        if (serviceTokens.GITHUB_TOKEN) {
          console.log(`✅ GitHub 토큰 저장됨 - 서버는 사용 시 자동으로 연결됩니다.`);
          // On-demand 연결 방식이므로 서버 재시작 불필요
        }

        // Firecrawl 토큰이 있으면 firecrawl-mcp 서버 재시작 (활성화된 경우)
        if (serviceTokens.FIRECRAWL_TOKEN) {
          console.log(`✅ Firecrawl 토큰 저장됨 - 서버는 사용 시 자동으로 연결됩니다.`);
          // On-demand 연결 방식이므로 서버 재시작 불필요
        }
      } catch (error) {
        console.warn(`⚠️ MCP 서버 재시작 중 오류:`, error);
        // 서버 재시작 실패는 치명적이지 않으므로 계속 진행
      }
    }

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

/**
 * MCPHub Key 삭제
 */
export const deleteUserKey = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증되지 않은 사용자입니다.'
      });
    }

    const { keyId } = req.params;

    await mcpHubKeyService.deleteKey(keyId, user.id);

    res.json({
      success: true,
      message: '키가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('❌ 키 삭제 오류:', error);

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '키 삭제 중 오류가 발생했습니다.'
    });
  }
}; 