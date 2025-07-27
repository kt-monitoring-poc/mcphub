import { Request, Response } from 'express';
import { getAppDataSource } from '../db/connection.js';
import { User } from '../db/entities/User.js';
import { MCPHubKey } from '../db/entities/MCPHubKey.js';

// 시스템 통계 조회
export const getSystemStats = async (req: Request, res: Response) => {
  try {
    const dataSource = getAppDataSource();
    const userRepo = dataSource.getRepository(User);
    const keyRepo = dataSource.getRepository(MCPHubKey);

    // 사용자 통계
    const totalUsers = await userRepo.count();
    const activeUsers = await userRepo.count({ where: { isActive: true } });

    // 키 통계
    const totalKeys = await keyRepo.count();
    const activeKeys = await keyRepo.count({ where: { isActive: true } });

    // 서버 통계 (임시 - 실제 서버 테이블이 없으므로)
    const totalServers = 4; // 하드코딩
    const activeServers = 3; // 하드코딩

    // 오늘 로그 수 (임시 - 실제 로그 테이블이 없으므로)
    const todayLogs = Math.floor(Math.random() * 1000) + 500;

    // 시스템 상태 (임시)
    const systemStatus = 'healthy';

    const stats = {
      totalUsers,
      activeUsers,
      totalServers,
      activeServers,
      totalKeys,
      activeKeys,
      todayLogs,
      systemStatus
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('시스템 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '시스템 통계 조회에 실패했습니다.' });
  }
};

// 최근 활동 조회
export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const dataSource = getAppDataSource();
    const userRepo = dataSource.getRepository(User);
    const keyRepo = dataSource.getRepository(MCPHubKey);

    const activities: any[] = [];

    // 최근 가입한 사용자들
    const recentUsers = await userRepo.find({
      order: { createdAt: 'DESC' },
      take: 3
    });

    recentUsers.forEach(user => {
      const timeDiff = Date.now() - new Date(user.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      activities.push({
        id: `user-${user.id}`,
        type: 'user',
        message: `새 사용자 ${user.githubUsername || user.displayName}이 가입했습니다.`,
        time: `${minutesAgo}분 전`,
        userId: user.githubUsername || user.displayName
      });
    });

    // 최근 생성된 키들
    const recentKeys = await keyRepo.find({
      order: { createdAt: 'DESC' },
      take: 2,
      relations: ['user']
    });

    recentKeys.forEach(key => {
      const timeDiff = Date.now() - new Date(key.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      activities.push({
        id: `key-${key.id}`,
        type: 'key',
        message: `${key.user.githubUsername || key.user.displayName} 사용자가 새 MCPHub 키를 생성했습니다.`,
        time: `${minutesAgo}분 전`,
        userId: key.user.githubUsername || key.user.displayName
      });
    });

    // 최근 로그인한 사용자들
    const recentLogins = await userRepo
      .createQueryBuilder('user')
      .where('user.lastLoginAt IS NOT NULL')
      .orderBy('user.lastLoginAt', 'DESC')
      .take(2)
      .getMany();

    recentLogins.forEach(user => {
      if (user.lastLoginAt) {
        const timeDiff = Date.now() - new Date(user.lastLoginAt).getTime();
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        
        activities.push({
          id: `login-${user.id}`,
          type: 'info',
          message: `${user.githubUsername || user.displayName} 사용자가 로그인했습니다.`,
          time: `${minutesAgo}분 전`,
          userId: user.githubUsername || user.displayName
        });
      }
    });

    // 시간순으로 정렬
    activities.sort((a, b) => {
      const timeA = parseInt(a.time.split(' ')[0]);
      const timeB = parseInt(b.time.split(' ')[0]);
      return timeA - timeB;
    });

    res.json({ success: true, data: activities.slice(0, 10) });
  } catch (error) {
    console.error('최근 활동 조회 오류:', error);
    res.status(500).json({ success: false, message: '최근 활동 조회에 실패했습니다.' });
  }
};

// 사용자 키 현황 조회
export const getUserKeyStatus = async (req: Request, res: Response) => {
  try {
    const dataSource = getAppDataSource();
    const userRepo = dataSource.getRepository(User);
    const keyRepo = dataSource.getRepository(MCPHubKey);

    const users = await userRepo.find({
      order: { createdAt: 'DESC' }
    });

    const userKeys = await Promise.all(
      users.map(async (user) => {
        const key = await keyRepo.findOne({
          where: { userId: user.id, isActive: true }
        });

        const userKeyStatus = {
          userId: user.id,
          username: user.displayName || user.githubUsername,
          githubUsername: user.githubUsername,
          hasKey: !!key,
          isActive: user.isActive,
          keyInfo: key ? {
            id: key.id,
            name: key.name,
            isActive: key.isActive,
            expiresAt: key.expiresAt,
            lastUsedAt: key.lastUsedAt,
            usageCount: key.usageCount,
            createdAt: key.createdAt,
            daysUntilExpiry: Math.ceil((new Date(key.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          } : undefined
        };

        return userKeyStatus;
      })
    );

    res.json({ success: true, data: userKeys });
  } catch (error) {
    console.error('사용자 키 현황 조회 오류:', error);
    res.status(500).json({ success: false, message: '사용자 키 현황 조회에 실패했습니다.' });
  }
}; 