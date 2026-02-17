import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/error-handler.middleware';
import { helmetConfig, securityHeaders, sanitizeInput } from './middleware/security.middleware';
import { generalLimiter, authLimiter, uploadLimiter, captionLimiter, analyticsLimiter } from './middleware/rate-limit.middleware';
import { authRoutes } from './routes/auth.routes';
import { videoRoutes } from './routes/video.routes';
import { postRoutes } from './routes/post.routes';
import { accountRoutes } from './routes/account.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { clipRoutes } from './routes/clip.routes';
import { driveRoutes } from './routes/drive.routes';
import { sheetsRoutes } from './routes/sheets.routes';
import { oauthRoutes } from './routes/oauth.routes';

export const app = express();

// Security Middleware
app.use(helmetConfig);
app.use(securityHeaders);

// CORS
app.use(cors({
  origin: config.NODE_ENV === 'production'
    ? config.FRONTEND_URL
    : [config.FRONTEND_URL, 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Global rate limiting
app.use('/api', generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/videos', videoRoutes); // Upload limiter applied per route
app.use('/api/posts', postRoutes); // Caption limiter applied per route
app.use('/api/accounts', accountRoutes);
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use('/api/clip', clipRoutes); // Video cutting and editing
app.use('/api/drive', driveRoutes); // Google Drive integration
app.use('/api/sheets', sheetsRoutes); // Google Sheets bulk import
app.use('/api/oauth', oauthRoutes); // YouTube and Facebook OAuth

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
