import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/user')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getCurrentUser(@CurrentUser() user: { id: string }) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, onboardingCompleted: true },
    });
    return u ?? { onboardingCompleted: false };
  }

  @Patch('onboarding-completed')
  async setOnboardingCompleted(@CurrentUser() user: { id: string }) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true },
    });
    return { ok: true };
  }
}
