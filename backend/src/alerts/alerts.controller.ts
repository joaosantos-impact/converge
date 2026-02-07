import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const createAlertSchema = z.object({
  asset: z.string(),
  condition: z.enum(['above', 'below']),
  targetPrice: z.number().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
});

@Controller('api/alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { exchangeAccount: { userId: user.id } },
      select: {
        id: true,
        symbol: true,
        condition: true,
        targetPrice: true,
        isActive: true,
        isTriggered: true,
        createdAt: true,
        exchangeAccount: { select: { exchange: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return alerts.map((alert) => ({
      id: alert.id,
      asset: alert.symbol.split('/')[0],
      condition: alert.condition,
      price: alert.targetPrice,
      isActive: alert.isActive,
      triggered: alert.isTriggered,
      exchange: alert.exchangeAccount.exchange,
      createdAt: alert.createdAt,
    }));
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 300000 } })
  async create(@CurrentUser() user: any, @Body() body: any) {
    const parsed = createAlertSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Dados inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = parsed.data;

    const exchangeAccount = await this.prisma.exchangeAccount.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!exchangeAccount) {
      throw new HttpException(
        'Nenhuma exchange conectada. Conecta uma exchange primeiro.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const alert = await this.prisma.priceAlert.create({
      data: {
        exchangeAccountId: exchangeAccount.id,
        symbol: `${data.asset}/USDT`,
        condition: data.condition,
        targetPrice: data.targetPrice,
      },
      select: {
        id: true,
        symbol: true,
        condition: true,
        targetPrice: true,
        isActive: true,
        isTriggered: true,
        createdAt: true,
        exchangeAccount: { select: { exchange: true } },
      },
    });

    return {
      id: alert.id,
      asset: alert.symbol.split('/')[0],
      condition: alert.condition,
      price: alert.targetPrice,
      isActive: alert.isActive,
      triggered: alert.isTriggered,
      exchange: alert.exchangeAccount?.exchange || '',
      createdAt: alert.createdAt,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Dados inválidos', HttpStatus.BAD_REQUEST);
    }

    const alert = await this.prisma.priceAlert.findFirst({
      where: { id, exchangeAccount: { userId: user.id } },
    });

    if (!alert) {
      throw new HttpException('Alerta não encontrado', HttpStatus.NOT_FOUND);
    }

    const updated = await this.prisma.priceAlert.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
    });

    return { id: updated.id, isActive: updated.isActive };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const alert = await this.prisma.priceAlert.findFirst({
      where: { id, exchangeAccount: { userId: user.id } },
    });

    if (!alert) {
      throw new HttpException('Alerta não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.prisma.priceAlert.delete({ where: { id } });
    return { success: true };
  }
}
