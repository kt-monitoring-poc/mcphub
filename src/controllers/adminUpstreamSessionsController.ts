import { Request, Response } from 'express';
import RedisSessionStore from '../services/redisSessionStore.js';

export const listUpstreamSessions = async (_req: Request, res: Response) => {
  try {
    const store = RedisSessionStore.getInstance();
    const sessions = await store.listAll();
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Failed to list upstream sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to list upstream sessions' });
  }
};

export const deleteUpstreamSession = async (req: Request, res: Response) => {
  try {
    const { serverName, contextKey } = req.params as { serverName: string; contextKey: string };
    if (!serverName || !contextKey) {
      return res.status(400).json({ success: false, message: 'serverName and contextKey are required' });
    }
    const store = RedisSessionStore.getInstance();
    await store.deleteSessionId({ serverName, contextKey });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Failed to delete upstream session:', error);
    res.status(500).json({ success: false, message: 'Failed to delete upstream session' });
  }
};


