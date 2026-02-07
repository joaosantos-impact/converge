import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AlertsController],
})
export class AlertsModule {}
