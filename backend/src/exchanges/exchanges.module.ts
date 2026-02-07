import { Module, forwardRef } from '@nestjs/common';
import { ExchangesController } from './exchanges.controller';
import { EncryptionService } from './encryption.service';
import { CcxtService } from './ccxt.service';
import { AuthModule } from '../auth/auth.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [AuthModule, forwardRef(() => SyncModule)],
  controllers: [ExchangesController],
  providers: [EncryptionService, CcxtService],
  exports: [EncryptionService, CcxtService],
})
export class ExchangesModule {}
