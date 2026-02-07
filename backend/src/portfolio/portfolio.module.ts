import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { ShareController } from './share.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PortfolioController, ShareController],
})
export class PortfolioModule {}
