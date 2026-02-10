import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor } from 'better-auth/plugins';
import { toNodeHandler } from 'better-auth/node';
import { PrismaService } from '../prisma/prisma.service';
import { IncomingMessage, ServerResponse } from 'http';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private auth!: ReturnType<typeof betterAuth>;
  public handler!: ReturnType<typeof toNodeHandler>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const baseURL = process.env.BETTER_AUTH_URL;
    const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      socialProviders.google = {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      };
    }
    this.auth = betterAuth({
      appName: 'Converge',
      baseURL,
      database: prismaAdapter(this.prisma, {
        provider: 'postgresql',
      }),
      basePath: '/api/auth',
      socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
      user: {
        additionalFields: {
          onboardingCompleted: {
            type: 'boolean',
            required: false,
            defaultValue: false,
          },
        },
      },
      emailAndPassword: {
        enabled: true,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60, // 5 minutes
        },
      },
      advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
        defaultCookieAttributes: {
          sameSite: 'lax' as const,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        },
      },
      plugins: [
        twoFactor({
          issuer: 'Converge',
        }),
      ],
    });

    this.handler = toNodeHandler(this.auth);
    this.logger.log('Better Auth initialized');
  }

  /**
   * Get session from request headers.
   * Used by AuthGuard to validate sessions.
   */
  async getSession(headers: Headers) {
    return this.auth.api.getSession({ headers });
  }

  /**
   * Handle raw Node.js request/response for Better Auth catch-all routes.
   */
  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    return this.handler(req, res);
  }
}
