import { Module } from '@nestjs/common';
import { StageOttController } from './stage-ott.controller';
import { StageOttService } from './stage-ott.service';

@Module({
  controllers: [StageOttController],
  providers: [StageOttService],
  exports: [StageOttService],
})
export class StageOttModule {}
