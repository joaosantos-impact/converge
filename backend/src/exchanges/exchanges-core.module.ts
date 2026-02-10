import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { CcxtService } from './ccxt.service';

/**
 * Core exchange services used by both ExchangesModule and SyncModule.
 * Extracted to break circular dependency: SyncModule needs CcxtService,
 * ExchangesModule needs SYNC_QUEUE_SERVICE from SyncModule.
 */
@Module({
  providers: [EncryptionService, CcxtService],
  exports: [EncryptionService, CcxtService],
})
export class ExchangesCoreModule {}
