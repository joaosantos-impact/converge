import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FeedController],
})
export class FeedModule {}
