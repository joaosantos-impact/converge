import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

/**
 * Catch-all controller that forwards all /api/auth/* requests
 * to Better Auth's Node.js handler.
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    return this.authService.handleRequest(req, res);
  }
}
