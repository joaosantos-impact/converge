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

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  coverImage: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(false),
});

@Controller('api/blog')
export class BlogController {
  private readonly logger = new Logger(BlogController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll(@Req() req: Request, @Query('all') showAll?: string, @Res() res?: Response) {
    // Check if admin
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

    const posts = await this.prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        published: true,
        tags: true,
        views: true,
        createdAt: true,
        author: { select: { name: true, image: true } },
      },
    });

    res!.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res!.json(posts);
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string, @Res() res: Response) {
    const post = await this.prisma.blogPost.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: { author: { select: { name: true, image: true } } },
    });

    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND);
    }

    // Increment views
    this.prisma.blogPost.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    }).catch((e) => this.logger.error('Failed to increment views:', e));

    return res.json(post);
  }

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  async create(@CurrentUser() user: any, @Body() body: any) {
    const data = createPostSchema.parse(body);

    const post = await this.prisma.blogPost.create({
      data: {
        ...data,
        authorId: user.id,
      },
    });

    return post;
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    const post = await this.prisma.blogPost.update({
      where: { id },
      data: body,
    });

    return post;
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    return { success: true };
  }
}
