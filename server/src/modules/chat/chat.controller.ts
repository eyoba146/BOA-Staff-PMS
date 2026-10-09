import type { Request, Response, NextFunction } from 'express';
import * as chatService from './chat.service.js';
import { ApiError } from '../../utils/apiError.js';

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const list = await chatService.listConversations(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const messages = await chatService.getMessages(id, userId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const { body } = req.body;
    if (!body || !body.trim()) {
      throw ApiError.badRequest('Message body is required.');
    }
    const msg = await chatService.sendMessage(id, userId, body);
    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
}

export async function editMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const convId = req.params.convId as string;
    const msgId = req.params.msgId as string;
    const userId = req.user!.id || req.user!.userId;
    const { body } = req.body;
    if (!body || !body.trim()) {
      throw ApiError.badRequest('Message body is required.');
    }
    const msg = await chatService.editMessage(convId, msgId, userId, body);
    res.json(msg);
  } catch (err) {
    next(err);
  }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const convId = req.params.convId as string;
    const msgId = req.params.msgId as string;
    const userId = req.user!.id || req.user!.userId;
    await chatService.deleteMessage(convId, msgId, userId, req.user!.role);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function startDirect(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { participantId } = req.body;
    if (!participantId) {
      throw ApiError.badRequest('participantId is required.');
    }
    const conv = await chatService.startDirectConversation(userId, participantId);
    res.status(201).json(conv);
  } catch (err) {
    next(err);
  }
}
