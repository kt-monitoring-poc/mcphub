import { Router } from 'express';
import {
    createMcpServer,
    deleteMcpServer,
    deleteUserApiKey,
    getAllMcpServers,
    getEnabledMcpServers,
    getMcpServer,
    getUserApiKeys,
    setUserApiKey,
    toggleMcpServer,
    updateMcpServer
} from '../controllers/mcpServerController.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';

const router = Router();

// 관리자 전용 라우트 - MCP 서버 관리
router.get('/admin/servers', requireAuth, requireAdmin, getAllMcpServers);
router.get('/admin/servers/enabled', requireAuth, requireAdmin, getEnabledMcpServers);
router.get('/admin/servers/:name', requireAuth, requireAdmin, getMcpServer);
router.post('/admin/servers', requireAuth, requireAdmin, createMcpServer);
router.put('/admin/servers/:name', requireAuth, requireAdmin, updateMcpServer);
router.delete('/admin/servers/:name', requireAuth, requireAdmin, deleteMcpServer);
router.patch('/admin/servers/:name/toggle', requireAuth, requireAdmin, toggleMcpServer);

// 사용자 라우트 - API 키 관리
router.get('/servers', requireAuth, getEnabledMcpServers); // 사용자용 서버 목록
router.get('/servers/:serverName/api-keys', requireAuth, getUserApiKeys);
router.post('/servers/:serverName/api-keys', requireAuth, setUserApiKey);
router.delete('/servers/:serverName/api-keys', requireAuth, deleteUserApiKey);

export default router; 