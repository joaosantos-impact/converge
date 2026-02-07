import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { ChangePasswordController } from './change-password.controller';
import { DeleteAccountController } from './delete-account.controller';

@Module({
  controllers: [AuthController, ChangePasswordController, DeleteAccountController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
