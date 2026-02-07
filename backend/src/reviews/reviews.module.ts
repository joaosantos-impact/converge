import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
