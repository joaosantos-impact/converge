import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
