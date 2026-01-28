import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { z } from 'zod';

const connectAccountSchema = z.object({
  platform: z.enum(['INSTAGRAM', 'FACEBOOK', 'YOUTUBE']),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  accountId: z.string(),
  username: z.string(),
  metadata: z.any().optional(),
});

export const getAccounts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        platform: true,
        username: true,
        accountId: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({ accounts });
  } catch (error) {
    next(error);
  }
};

export const connectAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = connectAccountSchema.parse(req.body);

    const account = await prisma.socialAccount.create({
      data: {
        userId: req.user!.id,
        platform: data.platform,
        accountId: data.accountId,
        username: data.username,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        metadata: data.metadata,
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      message: 'Account connected successfully',
      account: {
        id: account.id,
        platform: account.platform,
        username: account.username,
        status: account.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
