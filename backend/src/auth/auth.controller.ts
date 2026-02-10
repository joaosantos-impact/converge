import { Controller, All, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

/**
 * Catch-all controller that forwards all /api/auth/* requests
 * to Better Auth's Node.js handler.
 */
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @All('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    try {
      return await this.authService.handleRequest(req, res);
    } catch (err) {
      this.logger.error(`Auth error on ${req.method} ${req.url}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Auth failed', message: (err as Error)?.message });
      }
    }
  }
}
