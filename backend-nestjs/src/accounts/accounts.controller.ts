import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  getAll(@CurrentUser() user: CurrentUserPayload) {
    return this.accountsService.getAll(user.id);
  }

  @Post('connect')
  connect(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.accountsService.connect(user.id, body);
  }

  @Delete(':id')
  disconnect(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.accountsService.disconnect(user.id, id);
  }
}
