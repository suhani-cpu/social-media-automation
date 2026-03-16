import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [
    MulterModule.register({ dest: '/tmp/uploads' }),
    DriveModule,
  ],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
