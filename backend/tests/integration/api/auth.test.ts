import request from 'supertest';
import { app } from '../../../src/app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = 'hashed-password';
      const mockUser = {
        id: 'user-id',
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'mock-jwt-token';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 if email already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      const existingUser = {
        id: 'existing-id',
        email: userData.email,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Email already registered');
    });

    it('should return 400 if required fields are missing', async () => {
      const invalidData = {
        email: 'test@example.com',
        // missing name and password
      };

      await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 if email format is invalid', async () => {
      const invalidData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials and return 200', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        name: 'Test User',
        email: credentials.email,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'mock-jwt-token';

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(credentials.email);
      expect(response.body.token).toBe(mockToken);
    });

    it('should return 401 if user not found', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 if password is incorrect', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const mockUser = {
        id: 'user-id',
        email: credentials.email,
        password: 'hashed-password',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 400 if email or password is missing', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on auth endpoints', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Make 6 requests (rate limit is 5 per 15 minutes)
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials);

        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429);
          expect(response.body.error).toMatch(/Too many/);
        }
      }
    });
  });
});
