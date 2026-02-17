import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { importFromSheet, previewSheet } from '../controllers/sheets.controller';

export const sheetsRoutes = Router();

// All routes require authentication
sheetsRoutes.use(authMiddleware);

// Preview sheet data before importing
sheetsRoutes.get('/preview', previewSheet);

// Import videos from Google Sheets
sheetsRoutes.post('/import', importFromSheet);
