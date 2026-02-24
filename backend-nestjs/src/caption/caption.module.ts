import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaptionService } from './caption.service';

@Module({
  imports: [ConfigModule],
  providers: [CaptionService],
  exports: [CaptionService],
})
export class CaptionModule {}
