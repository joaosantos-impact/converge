import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TransfersController],
})
export class TransfersModule {}
