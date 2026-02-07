import {
  Controller,
  Get,
  Post,
  Body,
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

const followSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(['follow', 'unfollow']),
});

@Controller('api/follow')
@UseGuards(AuthGuard)
export class FollowController {
  private readonly logger = new Logger(FollowController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStats(@CurrentUser() user: any) {
    const [followers, following] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: user.id } }),
      this.prisma.follow.count({ where: { followerId: user.id } }),
    ]);

    return { followers, following };
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async followAction(@CurrentUser() user: any, @Body() body: any) {
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Dados inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { targetUserId, action } = parsed.data;

    if (targetUserId === user.id) {
      throw new HttpException(
        'Não podes seguir-te a ti próprio',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (action === 'follow') {
      const targetProfile = await this.prisma.userProfile.findUnique({
        where: { userId: targetUserId },
      });

      if (!targetProfile?.isPublic) {
        throw new HttpException(
          'Perfil do utilizador não é público',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: targetUserId,
          },
        },
        create: { followerId: user.id, followingId: targetUserId },
        update: {},
      });

      return { success: true, following: true };
    } else {
      await this.prisma.follow.deleteMany({
        where: { followerId: user.id, followingId: targetUserId },
      });

      return { success: true, following: false };
    }
  }
}
