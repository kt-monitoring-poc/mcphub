import { UserGroup } from '../db/entities/UserGroup.js';
import { UserGroupRepository } from '../db/repositories/index.js';

export class UserGroupService {
  private userGroupRepository: UserGroupRepository;

  constructor() {
    this.userGroupRepository = new UserGroupRepository();
  }

  async getUserGroups(userId: string): Promise<UserGroup[]> {
    return this.userGroupRepository.findByUserId(userId);
  }

  async getActiveUserGroups(userId: string): Promise<UserGroup[]> {
    return this.userGroupRepository.findActiveByUserId(userId);
  }

  async getGroupById(groupId: string, userId: string): Promise<UserGroup | null> {
    return this.userGroupRepository.findByIdAndUserId(groupId, userId);
  }

  async createGroup(userId: string, data: {
    name: string;
    description?: string;
    servers: string[];
  }): Promise<UserGroup> {
    return this.userGroupRepository.createGroup({
      ...data,
      userId,
      isActive: true
    });
  }

  async updateGroup(groupId: string, userId: string, data: {
    name?: string;
    description?: string;
    servers?: string[];
  }): Promise<UserGroup | null> {
    return this.userGroupRepository.updateGroup(groupId, userId, data);
  }

  async deleteGroup(groupId: string, userId: string): Promise<boolean> {
    return this.userGroupRepository.deleteGroup(groupId, userId);
  }

  async setGroupActive(groupId: string, userId: string, isActive: boolean): Promise<UserGroup | null> {
    return this.userGroupRepository.setGroupActive(groupId, userId, isActive);
  }

  async getActiveServers(userId: string): Promise<string[]> {
    const activeGroups = await this.getActiveUserGroups(userId);
    if (activeGroups.length === 0) return []; // 활성 그룹이 없으면 빈 배열 반환

    // 모든 활성 그룹의 서버 목록을 하나의 배열로 합치고 중복 제거
    const servers = activeGroups.reduce((acc, group) => {
      return [...acc, ...group.servers];
    }, [] as string[]);

    return [...new Set(servers)] as string[];
  }
}