import { Router } from 'express';
import { register, login, updateProfile } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.put('/profile', authMiddleware, updateProfile);
