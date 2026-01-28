import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter - 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Auth endpoints rate limiter - 5 requests per 15 minutes
 * Stricter limits for login/register to prevent brute force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many authentication attempts, please try again later.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Upload endpoints rate limiter - 10 requests per hour
 * Prevent abuse of upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: 'Upload limit exceeded, please try again later.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Upload limit exceeded. Please try again in an hour.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Caption generation rate limiter - 20 requests per hour
 * Prevent abuse of AI caption generation
 */
export const captionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 caption generations per hour
  message: 'Caption generation limit exceeded, please try again later.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Caption generation limit exceeded. Please try again in an hour.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Analytics endpoints rate limiter - 30 requests per 15 minutes
 */
export const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: 'Too many analytics requests, please try again later.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Analytics request limit exceeded. Please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});
