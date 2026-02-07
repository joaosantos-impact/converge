import {
  Controller,
  Delete,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/auth')
export class DeleteAccountController {
  private readonly logger = new Logger(DeleteAccountController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Delete('delete-account')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
  async deleteAccount(@CurrentUser() user: any) {
    try {
      const userId = user.id;

      await this.prisma.$transaction(async (tx) => {
        // Delete social data
        await tx.postLike.deleteMany({ where: { userId } });
        await tx.postComment.deleteMany({ where: { userId } });
        await tx.postTrade.deleteMany({ where: { post: { userId } } });
        await tx.post.deleteMany({ where: { userId } });
        await tx.follow.deleteMany({
          where: { OR: [{ followerId: userId }, { followingId: userId }] },
        });

        // Delete portfolio data
        await tx.priceAlert.deleteMany({
          where: { exchangeAccount: { userId } },
        });
        await tx.trade.deleteMany({
          where: { exchangeAccount: { userId } },
        });
        await tx.balance.deleteMany({
          where: { exchangeAccount: { userId } },
        });
        await tx.exchangeAccount.deleteMany({ where: { userId } });
        await tx.portfolioSnapshot.deleteMany({ where: { userId } });

        // Delete user profile
        await tx.userProfile.deleteMany({ where: { userId } });

        // Delete sync logs
        await tx.syncLog.deleteMany({ where: { userId } });

        // Delete auth data
        await tx.session.deleteMany({ where: { userId } });
        await tx.account.deleteMany({ where: { userId } });

        // Finally delete the user
        await tx.user.delete({ where: { id: userId } });
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting account:', error);
      throw new HttpException(
        'Erro ao eliminar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
