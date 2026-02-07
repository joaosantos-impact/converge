import {
  Controller,
  Get,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface TransferMatch {
  withdrawalId: string;
  depositId: string;
  asset: string;
  amount: number;
  fromExchange: string;
  toExchange: string;
  withdrawalTime: Date;
  depositTime: Date;
  confidence: number;
}

const TIME_WINDOW_MS = 2 * 60 * 60 * 1000;
const AMOUNT_TOLERANCE = 0.02;

@Controller('api/transfers')
@UseGuards(AuthGuard)
export class TransfersController {
  private readonly logger = new Logger(TransfersController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async detectTransfers(@CurrentUser() user: any) {
    const exchangeAccounts = await this.prisma.exchangeAccount.findMany({
      where: { userId: user.id },
      select: { id: true, exchange: true },
    });

    if (exchangeAccounts.length < 2) {
      return {
        transfers: [],
        message: 'Precisas de pelo menos 2 integrações para detetar transferências',
      };
    }

    const trades = await this.prisma.trade.findMany({
      where: {
        exchangeAccountId: { in: exchangeAccounts.map((ea) => ea.id) },
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    const tradeRecords = trades.map((t) => {
      const ea = exchangeAccounts.find((e) => e.id === t.exchangeAccountId);
      return {
        id: t.id,
        symbol: t.symbol,
        side: t.side,
        amount: t.amount,
        timestamp: t.timestamp,
        exchange: ea?.exchange || 'unknown',
        exchangeAccountId: t.exchangeAccountId,
        fee: t.fee || 0,
      };
    });

    const transfers = this.detectTransferMatches(tradeRecords);

    return {
      transfers: transfers.map((t) => ({
        ...t,
        withdrawalTime: t.withdrawalTime.toISOString(),
        depositTime: t.depositTime.toISOString(),
      })),
      totalDetected: transfers.length,
    };
  }

  private detectTransferMatches(trades: any[]): TransferMatch[] {
    const matches: TransferMatch[] = [];
    const usedIds = new Set<string>();

    const withdrawals = trades
      .filter((t) => t.side === 'sell' || t.side === 'withdrawal')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const deposits = trades
      .filter((t) => t.side === 'buy' || t.side === 'deposit')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const withdrawal of withdrawals) {
      if (usedIds.has(withdrawal.id)) continue;
      const asset = withdrawal.symbol.split('/')[0];

      for (const deposit of deposits) {
        if (usedIds.has(deposit.id)) continue;
        if (deposit.exchangeAccountId === withdrawal.exchangeAccountId) continue;

        const depositAsset = deposit.symbol.split('/')[0];
        if (asset !== depositAsset) continue;

        const timeDiff = Math.abs(
          deposit.timestamp.getTime() - withdrawal.timestamp.getTime(),
        );
        if (timeDiff > TIME_WINDOW_MS) continue;

        const amountDiff =
          Math.abs(deposit.amount - withdrawal.amount) / withdrawal.amount;
        if (amountDiff > AMOUNT_TOLERANCE) continue;

        let confidence = 0.5;
        if (
          deposit.amount <= withdrawal.amount &&
          deposit.amount >= withdrawal.amount * 0.98
        )
          confidence += 0.2;
        if (timeDiff < 60 * 60 * 1000) confidence += 0.15;
        if (withdrawal.exchange !== deposit.exchange) confidence += 0.15;

        matches.push({
          withdrawalId: withdrawal.id,
          depositId: deposit.id,
          asset,
          amount: withdrawal.amount,
          fromExchange: withdrawal.exchange,
          toExchange: deposit.exchange,
          withdrawalTime: withdrawal.timestamp,
          depositTime: deposit.timestamp,
          confidence: Math.min(confidence, 1),
        });

        usedIds.add(withdrawal.id);
        usedIds.add(deposit.id);
        break;
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }
}
