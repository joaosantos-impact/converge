import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { ChangePasswordController } from './change-password.controller';
import { DeleteAccountController } from './delete-account.controller';
import { OnboardingController } from './onboarding.controller';

@Module({
  controllers: [AuthController, ChangePasswordController, DeleteAccountController, OnboardingController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
