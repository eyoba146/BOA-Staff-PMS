import type { Response } from 'express';

interface RealtimeClient {
  id: string;
  userId: string;
  role: string;
  branchName?: string;
  res: Response;
}

const clients: Map<string, RealtimeClient> = new Map();

export const realtimeService = {
  addClient(clientId: string, userId: string, role: string, branchName: string | undefined, res: Response) {
    clients.set(clientId, { id: clientId, userId, role, branchName, res });
  },

  removeClient(clientId: string) {
    clients.delete(clientId);
  },

  /**
   * Broadcast an event to all connected clients in a specific conversation
   */
  broadcastToConversation(participantIds: string[], event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.values()) {
      if (participantIds.includes(client.userId)) {
        try {
          client.res.write(payload);
        } catch {
          clients.delete(client.id);
        }
      }
    }
  },

  /**
   * Broadcast an event to all connected branch users (e.g. new announcement)
   */
  broadcastToBranch(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.values()) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client.id);
      }
    }
  },

  /**
   * Send an event to a specific user (e.g. direct message, feedback, nav count invalidate)
   */
  sendToUser(userId: string, event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.values()) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch {
          clients.delete(client.id);
        }
      }
    }
  },

  /**
   * Send notification count invalidation to one or all users
   */
  notifyCountInvalidated(targetUserIds?: string[]) {
    const payload = `event: nav_counts_invalidated\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`;
    for (const client of clients.values()) {
      if (!targetUserIds || targetUserIds.includes(client.userId)) {
        try {
          client.res.write(payload);
        } catch {
          clients.delete(client.id);
        }
      }
    }
  },
};
