import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { CcxtService, SUPPORTED_EXCHANGES } from './ccxt.service';
import { SyncService } from '../sync/sync.service';

const supportedExchangeIds = SUPPORTED_EXCHANGES.map((e) => e.id);

const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  exchange: z.enum(supportedExchangeIds as [string, ...string[]]),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  apiPassphrase: z.string().optional(),
});

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  apiKey: z.string().min(1).optional(),
  apiSecret: z.string().min(1).optional(),
  apiPassphrase: z.string().optional(),
  isActive: z.boolean().optional(),
});

@Controller('api/exchange-accounts')
@UseGuards(AuthGuard)
export class ExchangesController {
  private readonly logger = new Logger(ExchangesController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly ccxt: CcxtService,
    @Inject(forwardRef(() => SyncService))
    private readonly syncService: SyncService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        exchange: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncTradeCount: true,
        createdAt: true,
        updatedAt: true,
        apiKey: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return accounts.map((account) => ({
      ...account,
      apiKey: this.maskEncryptedKey(account.apiKey),
    }));
  }

  @Get('details')
  async getDetails(@CurrentUser() user: any, @Query('id') id: string) {
    if (!id) {
      throw new HttpException('ID da conta é obrigatório', HttpStatus.BAD_REQUEST);
    }

    const account = await this.prisma.exchangeAccount.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        name: true,
        exchange: true,
        isActive: true,
        apiKey: true,
        apiSecret: true,
        apiPassphrase: true,
        lastSyncAt: true,
        lastSyncTradeCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      throw new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND);
    }

    return {
      id: account.id,
      name: account.name,
      exchange: account.exchange,
      isActive: account.isActive,
      lastSyncAt: account.lastSyncAt,
      lastSyncTradeCount: account.lastSyncTradeCount,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      apiKeyPreview: this.previewDecryptedKey(account.apiKey),
      apiSecretPreview: this.previewDecryptedKey(account.apiSecret),
      hasPassphrase: !!account.apiPassphrase,
      apiPassphrasePreview: account.apiPassphrase
        ? this.previewDecryptedKey(account.apiPassphrase)
        : null,
    };
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  async create(@CurrentUser() user: any, @Body() body: any) {
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Dados inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = parsed.data;

    if (data.exchange === 'okx' && !data.apiPassphrase) {
      throw new HttpException(
        'OKX requer uma passphrase de API',
        HttpStatus.BAD_REQUEST,
      );
    }

    const encryptedApiKey = this.encryption.encrypt(data.apiKey);
    const encryptedApiSecret = this.encryption.encrypt(data.apiSecret);
    const encryptedPassphrase = data.apiPassphrase
      ? this.encryption.encrypt(data.apiPassphrase)
      : null;

    // Test connection before saving
    try {
      const exchange = this.ccxt.createExchangeFromAccount({
        exchange: data.exchange,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        apiPassphrase: encryptedPassphrase,
      });
      await exchange.fetchBalance();
    } catch {
      throw new HttpException(
        'Falha ao conectar à exchange. Verifica as tuas credenciais API.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const account = await this.prisma.exchangeAccount.create({
      data: {
        userId: user.id,
        name: data.name,
        exchange: data.exchange,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        apiPassphrase: encryptedPassphrase,
      },
    });

    // Trigger full sync so SyncLog is created and frontend shows loading; skip cooldown for "just added"
    this.syncService.triggerSync(user.id, { skipCooldown: true }).catch((err) => {
      this.logger.error(`Auto-sync failed for ${account.name}:`, err);
    });

    return {
      id: account.id,
      name: account.name,
      exchange: account.exchange,
      isActive: account.isActive,
      createdAt: account.createdAt,
    };
  }

  @Patch()
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  async update(
    @CurrentUser() user: any,
    @Query('id') id: string,
    @Body() body: any,
  ) {
    if (!id) {
      throw new HttpException(
        'ID da conta é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.prisma.exchangeAccount.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      throw new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND);
    }

    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Dados inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = parsed.data;
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.apiKey !== undefined)
      updateData.apiKey = this.encryption.encrypt(data.apiKey);
    if (data.apiSecret !== undefined)
      updateData.apiSecret = this.encryption.encrypt(data.apiSecret);
    if (data.apiPassphrase !== undefined) {
      updateData.apiPassphrase = data.apiPassphrase
        ? this.encryption.encrypt(data.apiPassphrase)
        : null;
    }

    // Test connection if credentials are updated
    if (data.apiKey || data.apiSecret || data.apiPassphrase) {
      try {
        const exchange = this.ccxt.createExchangeFromAccount({
          exchange: existing.exchange,
          apiKey: data.apiKey
            ? this.encryption.encrypt(data.apiKey)
            : existing.apiKey,
          apiSecret: data.apiSecret
            ? this.encryption.encrypt(data.apiSecret)
            : existing.apiSecret,
          apiPassphrase: data.apiPassphrase
            ? this.encryption.encrypt(data.apiPassphrase)
            : existing.apiPassphrase,
        });
        await exchange.fetchBalance();
      } catch {
        throw new HttpException(
          'Falha ao conectar à exchange. Verifica as tuas credenciais API.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const account = await this.prisma.exchangeAccount.update({
      where: { id },
      data: updateData,
    });

    return {
      id: account.id,
      name: account.name,
      exchange: account.exchange,
      isActive: account.isActive,
      updatedAt: account.updatedAt,
    };
  }

  @Delete()
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  async remove(@CurrentUser() user: any, @Query('id') id: string) {
    if (!id) {
      throw new HttpException(
        'ID da conta é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.prisma.exchangeAccount.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      throw new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND);
    }

    await this.prisma.exchangeAccount.delete({ where: { id } });
    return { success: true };
  }

  private maskEncryptedKey(encryptedKey: string): string {
    const tail = encryptedKey.slice(-8);
    return `****${tail.slice(-4)}`;
  }

  private previewDecryptedKey(encryptedKey: string): string {
    try {
      const decrypted = this.encryption.decrypt(encryptedKey);
      if (decrypted.length <= 8) {
        return '••••••••';
      }
      return `${decrypted.slice(0, 4)}${'•'.repeat(Math.min(decrypted.length - 8, 20))}${decrypted.slice(-4)}`;
    } catch {
      return '••••••••';
    }
  }
}
