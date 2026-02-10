import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { ShareController } from './share.controller';
import { AuthModule } from '../auth/auth.module';
import { TradesModule } from '../trades/trades.module';

@Module({
  imports: [AuthModule, TradesModule],
  controllers: [PortfolioController, ShareController],
})
export class PortfolioModule {}
