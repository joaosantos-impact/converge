import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ||
  process.env.ADMIN_EMAIL ||
  'admin@converge.pt'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Guard that checks if the authenticated user is an admin.
 * Must be used AFTER AuthGuard.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      throw new ForbiddenException('Não autorizado');
    }

    return true;
  }
}
