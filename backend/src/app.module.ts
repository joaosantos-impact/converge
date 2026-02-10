import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';
import { ExchangesCoreModule } from './exchanges/exchanges-core.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TradesModule } from './trades/trades.module';
import { AlertsModule } from './alerts/alerts.module';
import { FeedModule } from './feed/feed.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { FollowModule } from './follow/follow.module';
import { BlogModule } from './blog/blog.module';
import { AdminModule } from './admin/admin.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PricesModule } from './prices/prices.module';
import { TransfersModule } from './transfers/transfers.module';

@Controller('api')
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '..', '.env'),
      ],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    AuthModule,
    ExchangesCoreModule,
    SyncModule.forRoot(),
    ExchangesModule,
    PortfolioModule,
    TradesModule,
    AlertsModule,
    FeedModule,
    LeaderboardModule,
    FollowModule,
    BlogModule,
    AdminModule,
    ReviewsModule,
    PricesModule,
    TransfersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
