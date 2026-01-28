import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getAccounts, connectAccount } from '../controllers/account.controller';

export const accountRoutes = Router();

accountRoutes.use(authMiddleware);

accountRoutes.get('/', getAccounts);
accountRoutes.post('/connect', connectAccount);
