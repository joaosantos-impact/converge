import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TaxesController } from './taxes.controller';

@Module({
  imports: [AuthModule],
  controllers: [TaxesController],
})
export class TaxesModule {}
