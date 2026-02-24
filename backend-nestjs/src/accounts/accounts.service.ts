import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(userId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        username: true,
        accountId: true,
        status: true,
        tokenExpiry: true,
        createdAt: true,
      },
    });
    return { accounts };
  }

  async connect(userId: string, data: {
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
    accessToken: string;
    refreshToken?: string;
    accountId: string;
    username: string;
    metadata?: any;
  }) {
    const account = await this.prisma.socialAccount.create({
      data: {
        userId,
        platform: data.platform,
        accountId: data.accountId,
        username: data.username,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        metadata: data.metadata,
        status: 'ACTIVE',
      },
    });

    return {
      message: 'Account connected successfully',
      account: {
        id: account.id,
        platform: account.platform,
        username: account.username,
        status: account.status,
      },
    };
  }

  async disconnect(userId: string, id: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    await this.prisma.socialAccount.delete({ where: { id } });

    return { message: 'Account disconnected successfully' };
  }
}
