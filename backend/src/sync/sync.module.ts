import { Module, forwardRef } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncCronService } from './sync-cron.service';
import { AuthModule } from '../auth/auth.module';
import { ExchangesModule } from '../exchanges/exchanges.module';

@Module({
  imports: [AuthModule, forwardRef(() => ExchangesModule)],
  controllers: [SyncController],
  providers: [SyncService, SyncCronService],
  exports: [SyncService],
})
export class SyncModule {}
