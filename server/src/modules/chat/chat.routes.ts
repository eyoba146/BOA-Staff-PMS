import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as chatController from './chat.controller.js';

export const chatRoutes = Router();

chatRoutes.get('/', authenticate, chatController.listConversations);
chatRoutes.get('/contacts', authenticate, chatController.getContacts);
chatRoutes.post('/', authenticate, chatController.startDirect);
chatRoutes.post('/group', authenticate, chatController.createGroup);

chatRoutes.post('/:id/participants', authenticate, chatController.addParticipant);
chatRoutes.delete('/:id/participants/:userId', authenticate, chatController.removeParticipant);

chatRoutes.get('/:id/messages', authenticate, chatController.getMessages);
chatRoutes.post('/:id/messages', authenticate, chatController.sendMessage);
chatRoutes.patch('/:convId/messages/:msgId', authenticate, chatController.editMessage);
chatRoutes.delete('/:convId/messages/:msgId', authenticate, chatController.deleteMessage);

chatRoutes.post('/:convId/messages/:msgId/pin', authenticate, chatController.pinMessage);
chatRoutes.post('/:convId/messages/:msgId/moderate', authenticate, chatController.moderateMessage);
