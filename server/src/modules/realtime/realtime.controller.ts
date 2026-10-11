import type { Request, Response } from 'express';
import { realtimeService } from './realtime.service.js';
import crypto from 'crypto';

export const realtimeController = {
  stream(req: Request, res: Response) {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const userId = (user.id || (user as any).userId) as string;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = `${userId}_${crypto.randomBytes(6).toString('hex')}`;
    realtimeService.addClient(clientId, userId, user.role, (user as any).branchName, res);

    // Initial greeting
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, userId, time: new Date().toISOString() })}\n\n`);

    // Heartbeat every 25s
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
        realtimeService.removeClient(clientId);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      realtimeService.removeClient(clientId);
    });
  },
};
