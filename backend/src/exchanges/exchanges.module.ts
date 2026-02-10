import { Module } from '@nestjs/common';
import { ExchangesController } from './exchanges.controller';
import { AuthModule } from '../auth/auth.module';
import { ExchangesCoreModule } from './exchanges-core.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [AuthModule, ExchangesCoreModule, SyncModule.forRoot()],
  controllers: [ExchangesController],
})
export class ExchangesModule {}
