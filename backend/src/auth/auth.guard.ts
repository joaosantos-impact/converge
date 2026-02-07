import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';

/**
 * Guard that validates the user session via Better Auth.
 * Attaches the user to request.user for downstream use.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Convert Express headers to Web API Headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const session = await this.authService.getSession(headers);

    if (!session?.user) {
      throw new UnauthorizedException('Não autenticado');
    }

    // Attach user to request
    (request as any).user = session.user;
    (request as any).session = session.session;
    return true;
  }
}
