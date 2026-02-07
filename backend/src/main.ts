import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from monorepo root (parent of backend/)
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
// Also try local .env (for standalone/Docker usage)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Global exception filter (PT-PT error messages)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable CORS for development (in production, Next.js proxies requests)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[Converge API] Running on http://localhost:${port}`);
}

bootstrap();
