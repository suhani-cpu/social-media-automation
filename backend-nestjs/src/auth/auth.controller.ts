import { Controller, Post, Put, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name?: string; brandName?: string; industry?: string; logoUrl?: string; defaultLanguage?: string; defaultPrivacy?: string },
  ) {
    return this.authService.updateProfile(user.id, body);
  }

  @Put('onboarding')
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { brandName?: string; industry?: string; defaultLanguage?: string },
  ) {
    return this.authService.completeOnboarding(user.id, body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getMe(user.id);
  }
}
