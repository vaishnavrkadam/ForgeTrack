import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators/auth.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication session cookie or bearer token is missing.',
        },
      });
    }

    let authContext = null;
    if (token.startsWith('ft_')) {
      // Validate as API Client Token
      authContext = await this.authService.validateApiToken(token);
    } else {
      // Validate as Cookie/Session Token
      authContext = await this.authService.validateSession(token);
    }

    if (!authContext) {
      throw new UnauthorizedException({
        error: {
          code: 'AUTH_INVALID',
          message: 'Authentication token is invalid or has expired.',
        },
      });
    }

    request.user = authContext.user;
    request.organization = authContext.organization;
    return true;
  }

  private extractToken(request: any): string | null {
    // 1. Try secure session cookie
    if (request.cookies?.sid) {
      return request.cookies.sid;
    }

    // 2. Try Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
