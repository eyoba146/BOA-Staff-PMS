import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as chatController from './chat.controller.js';

export const chatRoutes = Router();

chatRoutes.get('/', authenticate, chatController.listConversations);
chatRoutes.post('/', authenticate, chatController.startDirect);

chatRoutes.get('/:id/messages', authenticate, chatController.getMessages);
chatRoutes.post('/:id/messages', authenticate, chatController.sendMessage);
chatRoutes.patch('/:convId/messages/:msgId', authenticate, chatController.editMessage);
chatRoutes.delete('/:convId/messages/:msgId', authenticate, chatController.deleteMessage);
