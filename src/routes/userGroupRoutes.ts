import { Router } from 'express';
import { UserGroupController } from '../controllers/userGroupController.js';
import { auth as authMiddleware } from '../middlewares/auth.js';

const router = Router();
const userGroupController = new UserGroupController();

// 그룹 목록 조회
router.get('/', authMiddleware, (req, res) => userGroupController.getUserGroups(req, res));

// 새 그룹 생성
router.post('/', authMiddleware, (req, res) => userGroupController.createGroup(req, res));

// 그룹 수정
router.put('/:groupId', authMiddleware, (req, res) => userGroupController.updateGroup(req, res));

// 그룹 삭제
router.delete('/:groupId', authMiddleware, (req, res) => userGroupController.deleteGroup(req, res));

// 그룹 활성화/비활성화
router.patch('/:groupId/active', authMiddleware, (req, res) => userGroupController.setGroupActive(req, res));

export default router;