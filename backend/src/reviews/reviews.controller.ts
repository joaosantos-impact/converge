import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Req,
  Res,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'admin@converge.pt')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const createReviewSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().max(100),
  initials: z.string().max(4).optional(),
  text: z.string().min(1).max(1000),
  rating: z.number().int().min(1).max(5).default(5),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

const updateReviewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().max(100).optional(),
  initials: z.string().max(4).optional(),
  text: z.string().min(1).max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
});

@Controller('api/reviews')
export class ReviewsController {
  private readonly logger = new Logger(ReviewsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll(@Req() req: Request, @Query('all') showAll?: string, @Res() res?: Response) {
    let isAdmin = false;
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
          else headers.set(key, value);
        }
      }
      const session = await this.authService.getSession(headers);
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        isAdmin = true;
      }
    } catch {}

    const where = showAll === 'true' && isAdmin ? {} : { published: true };

    const reviews = await this.prisma.review.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    res!.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res!.json(reviews);
  }

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  async create(@Body() body: any) {
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Dados inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = parsed.data;
    const review = await this.prisma.review.create({
      data: {
        name: data.name,
        role: data.role,
        initials: data.initials || data.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        text: data.text,
        rating: data.rating,
        published: data.published,
        order: data.order,
      },
    });

    return review;
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    const parsed = updateReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Dados inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = parsed.data;
    const review = await this.prisma.review.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.initials !== undefined && { initials: data.initials }),
        ...(data.text !== undefined && { text: data.text }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.published !== undefined && { published: data.published }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return review;
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }
}
