import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncCronService } from './sync-cron.service';
import { SyncQueueService } from './sync-queue.service';
import { SyncQueueDirectService } from './sync-queue-direct.service';
import { SyncProcessor } from './sync.processor';
import { AuthModule } from '../auth/auth.module';
import { ExchangesCoreModule } from '../exchanges/exchanges-core.module';
import { SYNC_QUEUE_NAME } from './sync-queue.service';
import { SYNC_QUEUE_SERVICE } from './sync.constants';

@Module({})
export class SyncModule {
  static forRoot(): DynamicModule {
    const redisUrl = process.env.REDIS_URL;
    const useQueue = !!redisUrl;

    const imports: DynamicModule['imports'] = [
      AuthModule,
      ExchangesCoreModule,
    ];

    const providers: DynamicModule['providers'] = [SyncService, SyncCronService];

    if (useQueue) {
      imports.push(
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (config: ConfigService) => {
            const url = config.get<string>('REDIS_URL');
            if (url && (url.startsWith('redis://') || url.startsWith('rediss://'))) {
              const u = new URL(url);
              return {
                connection: {
                  host: u.hostname,
                  port: parseInt(u.port || '6379', 10),
                  password: u.password || undefined,
                  username: u.username || undefined,
                  tls: url.startsWith('rediss://') ? {} : undefined,
                },
              };
            }
            return { connection: { host: 'localhost', port: 6379 } };
          },
          inject: [ConfigService],
        }),
        BullModule.registerQueue({
          name: SYNC_QUEUE_NAME,
        }),
      );
      providers.push(
        SyncProcessor,
        SyncQueueService,
        {
          provide: SYNC_QUEUE_SERVICE,
          useExisting: SyncQueueService,
        },
      );
    } else {
      providers.push(
        SyncQueueDirectService,
        {
          provide: SYNC_QUEUE_SERVICE,
          useExisting: SyncQueueDirectService,
        },
      );
    }

    return {
      module: SyncModule,
      imports,
      controllers: [SyncController],
      providers,
      exports: [SyncService, SYNC_QUEUE_SERVICE],
    };
  }
}
