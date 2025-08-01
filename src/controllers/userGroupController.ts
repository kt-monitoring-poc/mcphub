import { Request, Response } from 'express';
import { UserGroupService } from '../services/userGroupService';

export class UserGroupController {
  private userGroupService: UserGroupService;

  constructor() {
    this.userGroupService = new UserGroupService();
  }

  async getUserGroups(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const groups = await this.userGroupService.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error('그룹 목록 조회 실패:', error);
      res.status(500).json({ error: '그룹 목록을 가져오는데 실패했습니다.' });
    }
  }

  async createGroup(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const { name, description, servers } = req.body;
      if (!name || !Array.isArray(servers)) {
        return res.status(400).json({ error: '잘못된 요청입니다.' });
      }

      const group = await this.userGroupService.createGroup(userId, {
        name,
        description,
        servers
      });

      res.status(201).json(group);
    } catch (error) {
      console.error('그룹 생성 실패:', error);
      res.status(500).json({ error: '그룹 생성에 실패했습니다.' });
    }
  }

  async updateGroup(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const { groupId } = req.params;
      const { name, description, servers } = req.body;

      const group = await this.userGroupService.updateGroup(groupId, userId, {
        name,
        description,
        servers
      });

      if (!group) {
        return res.status(404).json({ error: '그룹을 찾을 수 없습니다.' });
      }

      res.json(group);
    } catch (error) {
      console.error('그룹 수정 실패:', error);
      res.status(500).json({ error: '그룹 수정에 실패했습니다.' });
    }
  }

  async deleteGroup(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const { groupId } = req.params;
      const success = await this.userGroupService.deleteGroup(groupId, userId);

      if (!success) {
        return res.status(404).json({ error: '그룹을 찾을 수 없습니다.' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('그룹 삭제 실패:', error);
      res.status(500).json({ error: '그룹 삭제에 실패했습니다.' });
    }
  }

  async setGroupActive(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }

      const { groupId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: '잘못된 요청입니다.' });
      }

      const group = await this.userGroupService.setGroupActive(groupId, userId, isActive);

      if (!group) {
        return res.status(404).json({ error: '그룹을 찾을 수 없습니다.' });
      }

      res.json(group);
    } catch (error) {
      console.error('그룹 활성화 상태 변경 실패:', error);
      res.status(500).json({ error: '그룹 활성화 상태 변경에 실패했습니다.' });
    }
  }
}