import { UserGroup } from '../entities/UserGroup.js';
import { BaseRepository } from './BaseRepository.js';

export class UserGroupRepository extends BaseRepository<UserGroup> {
  constructor() {
    super(UserGroup);
  }

  async findByUserId(userId: string): Promise<UserGroup[]> {
    return this.repository.find({
      where: { userId },
      order: { updatedAt: 'DESC' }
    });
  }

  async findActiveByUserId(userId: string): Promise<UserGroup[]> {
    return this.repository.find({
      where: { userId, isActive: true },
      order: { updatedAt: 'DESC' }
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<UserGroup | null> {
    return this.repository.findOne({
      where: { id, userId }
    });
  }

  async createGroup(data: Partial<UserGroup>): Promise<UserGroup> {
    const group = this.repository.create(data);
    return this.repository.save(group);
  }

  async updateGroup(id: string, userId: string, data: Partial<UserGroup>): Promise<UserGroup | null> {
    const group = await this.findByIdAndUserId(id, userId);
    if (!group) return null;

    Object.assign(group, data);
    return this.repository.save(group);
  }

  async deleteGroup(id: string, userId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, userId });
    return result.affected ? result.affected > 0 : false;
  }

  async setGroupActive(id: string, userId: string, isActive: boolean): Promise<UserGroup | null> {
    const group = await this.findByIdAndUserId(id, userId);
    if (!group) return null;

    group.isActive = isActive;
    return this.repository.save(group);
  }
}