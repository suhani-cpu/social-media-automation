import { Request, Response } from 'express';
import { register, login } from '../../../src/controllers/auth.controller';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      mockRequest.body = userData;

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

      await register(mockRequest as Request, mockResponse as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
        },
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
        token: mockToken,
      });
    });

    it('should return 400 if email already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockRequest.body = userData;

      const existingUser = {
        id: 'existing-id',
        email: userData.email,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await register(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Email already registered',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        // missing name and password
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockRequest.body = credentials;

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

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: credentials.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password);
      expect(responseJson).toHaveBeenCalledWith({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
        token: mockToken,
      });
    });

    it('should return 401 if user not found', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Invalid credentials',
      });
    });

    it('should return 401 if password is incorrect', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockRequest.body = credentials;

      const mockUser = {
        id: 'user-id',
        email: credentials.email,
        password: 'hashed-password',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Invalid credentials',
      });
    });
  });
});
