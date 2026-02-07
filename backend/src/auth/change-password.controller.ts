import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'A password deve ter pelo menos 8 caracteres')
    .max(128),
});

@Controller('api/auth')
export class ChangePasswordController {
  private readonly logger = new Logger(ChangePasswordController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('change-password')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 min
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Dados inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const account = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
    });

    if (!account || !account.password) {
      throw new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND);
    }

    const isValid = await bcrypt.compare(currentPassword, account.password);
    if (!isValid) {
      throw new HttpException('Password atual incorreta', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    return { success: true };
  }
}
