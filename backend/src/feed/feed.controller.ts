import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  tradeIds: z.array(z.string()).default([]),
  showPrice: z.boolean().default(true),
  showAmount: z.boolean().default(true),
  showExchange: z.boolean().default(true),
  showPnl: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});

const likeSchema = z.object({
  postId: z.string().min(1),
});

@Controller('api/feed')
export class FeedController {
  private readonly logger = new Logger(FeedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('userId') userIdFilter?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    const page = Math.max(1, parseInt(pageParam || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20') || 20));
    const skip = (page - 1) * limit;

    // Try to get current user (optional auth)
    let currentUserId: string | null = null;
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
          else headers.set(key, value);
        }
      }
      const session = await this.authService.getSession(headers);
      currentUserId = session?.user?.id || null;
    } catch {}

    const where: any = {};
    if (userIdFilter) {
      where.userId = userIdFilter;
      if (userIdFilter !== currentUserId) where.isPublic = true;
    } else {
      where.isPublic = true;
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          trades: true,
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const userIds = [...new Set(posts.map((p) => p.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let likedPostIds: string[] = [];
    if (currentUserId) {
      const likes = await this.prisma.postLike.findMany({
        where: { userId: currentUserId, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true },
      });
      likedPostIds = likes.map((l) => l.postId);
    }

    const formattedPosts = posts.map((post) => {
      const postUser = userMap.get(post.userId);
      const isOwner = currentUserId === post.userId;

      return {
        id: post.id,
        user: postUser ? { id: postUser.id, name: postUser.name, image: postUser.image } : null,
        content: post.content,
        isOwner,
        trades: post.trades.map((trade) => ({
          id: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          price: post.showPrice || isOwner ? trade.price : null,
          amount: post.showAmount || isOwner ? trade.amount : null,
          cost: post.showPrice || isOwner ? trade.cost : null,
          exchange: post.showExchange || isOwner ? trade.exchange : null,
          timestamp: trade.timestamp,
        })),
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked: likedPostIds.includes(post.id),
        settings: {
          showPrice: post.showPrice,
          showAmount: post.showAmount,
          showExchange: post.showExchange,
          showPnl: post.showPnl,
        },
        createdAt: post.createdAt,
      };
    });

    return {
      posts: formattedPosts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  async create(@CurrentUser() user: any, @Body() body: any) {
    const data = createPostSchema.parse(body);

    const trades =
      data.tradeIds.length === 0
        ? []
        : await this.prisma.trade.findMany({
            where: {
              id: { in: data.tradeIds },
              exchangeAccount: { userId: user.id },
            },
            include: { exchangeAccount: { select: { exchange: true } } },
          });

    if (data.tradeIds.length > 0 && trades.length !== data.tradeIds.length) {
      throw new HttpException(
        'Alguns trades não foram encontrados',
        HttpStatus.BAD_REQUEST,
      );
    }

    const post = await this.prisma.post.create({
      data: {
        userId: user.id,
        content: data.content,
        showPrice: data.showPrice,
        showAmount: data.showAmount,
        showExchange: data.showExchange,
        showPnl: data.showPnl,
        isPublic: data.isPublic,
        trades: {
          create: trades.map((trade) => ({
            tradeId: trade.id,
            symbol: trade.symbol,
            side: trade.side,
            price: trade.price,
            amount: trade.amount,
            cost: trade.cost,
            exchange: trade.exchangeAccount.exchange,
            timestamp: trade.timestamp,
          })),
        },
      },
      include: {
        trades: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    return post;
  }

  @Delete()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async remove(@CurrentUser() user: any, @Query('id') postId: string) {
    if (!postId) {
      throw new HttpException('ID do post é obrigatório', HttpStatus.BAD_REQUEST);
    }

    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId: user.id },
    });

    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.prisma.post.delete({ where: { id: postId } });
    return { success: true };
  }

  // Like endpoints
  @Post('like')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async like(@CurrentUser() user: any, @Body() body: any) {
    const parsed = likeSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Post ID inválido', HttpStatus.BAD_REQUEST);
    }

    const { postId } = parsed.data;

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND);
    }

    const existingLike = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });

    if (existingLike) {
      throw new HttpException('Já deste like', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.postLike.create({
      data: { postId, userId: user.id },
    });

    const count = await this.prisma.postLike.count({ where: { postId } });
    return { success: true, count };
  }

  @Delete('like')
  @UseGuards(AuthGuard)
  async unlike(@CurrentUser() user: any, @Query('postId') postId: string) {
    if (!postId) {
      throw new HttpException('Post ID obrigatório', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.postLike.delete({
      where: { postId_userId: { postId, userId: user.id } },
    }).catch(() => {});

    const count = await this.prisma.postLike.count({ where: { postId } });
    return { success: true, count };
  }
}
