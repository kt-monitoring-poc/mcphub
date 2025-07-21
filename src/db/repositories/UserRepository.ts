import { Repository } from 'typeorm';
import { User } from '../entities/User.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * 사용자 Repository
 * GitHub OAuth 기반 사용자 데이터 관리를 담당합니다.
 */
export class UserRepository extends BaseRepository<User> {
  
  constructor(repository: Repository<User>) {
    super(repository);
  }

  /**
   * GitHub ID로 사용자 조회
   */
  async findByGithubId(githubId: string): Promise<User | null> {
    return this.repository.findOne({
      where: { githubId },
      relations: ['mcpHubKeys']
    });
  }

  /**
   * GitHub 사용자명으로 조회
   */
  async findByGithubUsername(githubUsername: string): Promise<User | null> {
    return this.repository.findOne({
      where: { githubUsername },
      relations: ['mcpHubKeys']
    });
  }

  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: ['mcpHubKeys']
    });
  }

  /**
   * GitHub OAuth 정보로 사용자 생성 또는 업데이트
   */
  async createOrUpdateFromGithub(githubData: {
    githubId: string;
    githubUsername: string;
    email?: string;
    avatarUrl?: string;
    displayName?: string;
    githubProfileUrl?: string;
  }): Promise<User> {
    // 기존 사용자 찾기
    let user = await this.findByGithubId(githubData.githubId);

    if (user) {
      // 기존 사용자 정보 업데이트
      user.githubUsername = githubData.githubUsername;
      user.email = githubData.email;
      user.avatarUrl = githubData.avatarUrl;
      user.displayName = githubData.displayName;
      user.githubProfileUrl = githubData.githubProfileUrl;
      user.lastLoginAt = new Date();
      
      return this.repository.save(user);
    } else {
      // 새 사용자 생성
      user = this.repository.create({
        githubId: githubData.githubId,
        githubUsername: githubData.githubUsername,
        email: githubData.email,
        avatarUrl: githubData.avatarUrl,
        displayName: githubData.displayName,
        githubProfileUrl: githubData.githubProfileUrl,
        lastLoginAt: new Date(),
        isActive: true,
        isAdmin: false
      });

      return this.repository.save(user);
    }
  }

  /**
   * 활성 사용자 목록 조회 (관리자용)
   */
  async findActiveUsers(limit: number = 50, offset: number = 0): Promise<[User[], number]> {
    return this.repository.findAndCount({
      where: { isActive: true },
      relations: ['mcpHubKeys'],
      order: { lastLoginAt: 'DESC' },
      take: limit,
      skip: offset
    });
  }

  /**
   * 관리자 권한 사용자 목록 조회
   */
  async findAdminUsers(): Promise<User[]> {
    return this.repository.find({
      where: { isAdmin: true, isActive: true },
      relations: ['mcpHubKeys'],
      order: { createdAt: 'ASC' }
    });
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    recentLoginUsers: number; // 최근 30일
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, adminUsers, recentLoginUsers] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { isActive: true } }),
      this.repository.count({ where: { isAdmin: true, isActive: true } }),
      this.repository.createQueryBuilder('user')
        .where('user.lastLoginAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount()
    ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      recentLoginUsers
    };
  }

  /**
   * 사용자 비활성화
   */
  async deactivateUser(userId: string): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    user.isActive = false;
    return this.repository.save(user);
  }

  /**
   * 사용자 관리자 권한 설정
   */
  async setAdminRole(userId: string, isAdmin: boolean): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    user.isAdmin = isAdmin;
    return this.repository.save(user);
  }
} 