import { Module } from '@nestjs/common';
import { FollowController } from './follow.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FollowController],
})
export class FollowModule {}
