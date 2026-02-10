import fs from 'fs';
import path from 'path';
import { defineConfig } from 'prisma/config';

/**
 * Load DATABASE_URL from .env file.
 * Tries monorepo root first, then local .env.
 * Falls back to process.env.DATABASE_URL (for Docker/CI).
 */
function loadDatabaseUrl(): string {
  const candidates = [
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of candidates) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
      if (match?.[1]) return match[1];
    } catch {
      // File doesn't exist, try next
    }
  }

  // Fallback for prisma generate (no DB needed); migrate deploy requires real URL at runtime
  return process.env.DATABASE_URL || 'postgresql://localhost:5432/dummy';
}

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: loadDatabaseUrl(),
  },
});
