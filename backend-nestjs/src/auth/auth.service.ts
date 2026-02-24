import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        brandName: true,
        industry: true,
        onboardingComplete: true,
        defaultLanguage: true,
        defaultPrivacy: true,
        createdAt: true,
      },
    });

    const token = this.jwtService.sign({ userId: user.id });

    return {
      message: 'User registered successfully',
      user,
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ userId: user.id });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        brandName: user.brandName,
        industry: user.industry,
        onboardingComplete: user.onboardingComplete,
        defaultLanguage: user.defaultLanguage,
        defaultPrivacy: user.defaultPrivacy,
      },
      token,
    };
  }

  async updateProfile(userId: string, data: {
    name?: string;
    brandName?: string;
    industry?: string;
    logoUrl?: string;
    defaultLanguage?: string;
    defaultPrivacy?: string;
  }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.brandName !== undefined) updateData.brandName = data.brandName;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.defaultLanguage) updateData.defaultLanguage = data.defaultLanguage;
    if (data.defaultPrivacy) updateData.defaultPrivacy = data.defaultPrivacy;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        brandName: true,
        industry: true,
        logoUrl: true,
        onboardingComplete: true,
        defaultLanguage: true,
        defaultPrivacy: true,
      },
    });

    return { message: 'Profile updated successfully', user };
  }

  async completeOnboarding(userId: string, data: {
    brandName?: string;
    industry?: string;
    defaultLanguage?: string;
  }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        brandName: data.brandName,
        industry: data.industry,
        defaultLanguage: data.defaultLanguage || 'ENGLISH',
        onboardingComplete: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        brandName: true,
        industry: true,
        onboardingComplete: true,
        defaultLanguage: true,
        defaultPrivacy: true,
      },
    });

    return { message: 'Onboarding completed', user };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        brandName: true,
        industry: true,
        logoUrl: true,
        onboardingComplete: true,
        defaultLanguage: true,
        defaultPrivacy: true,
        createdAt: true,
        _count: {
          select: {
            socialAccounts: true,
            posts: true,
            videos: true,
          },
        },
      },
    });

    return { user };
  }
}
