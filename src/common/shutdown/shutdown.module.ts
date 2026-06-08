import { Module } from '@nestjs/common';
import { GracefulShutdownService } from 'src/common/shutdown/graceful-shutdown.service';

@Module({
  providers: [GracefulShutdownService],
  exports: [GracefulShutdownService],
})
export class ShutdownModule {}
