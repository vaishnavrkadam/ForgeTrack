import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthzService } from '../authz.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authzService: AuthzService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission is required, let it pass
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organization = request.organization;

    if (!user) {
      throw new UnauthorizedException({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'You must be authenticated to access this resource.',
        },
      });
    }

    let orgId = request.params.organizationId || (organization ? organization.id : null);
    let projectId = request.params.projectId;

    if (!projectId && request.params.issueId) {
      const issueContext = await this.authzService.getIssueContext(request.params.issueId);
      if (issueContext) {
        projectId = issueContext.projectId;
        if (!orgId) orgId = issueContext.orgId;
      }
    }

    if (!orgId) {
      throw new ForbiddenException({
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Organization context is missing.',
        },
      });
    }

    let hasAccess = false;

    // Check if permission is Org level or Project level
    if (this.isOrgPermission(requiredPermission)) {
      hasAccess = await this.authzService.hasOrgPermission(user.id, orgId, requiredPermission);
    } else {
      if (projectId) {
        hasAccess = await this.authzService.hasProjectPermission(user.id, orgId, projectId, requiredPermission);
      } else {
        // Fallback: check org permissions or membership
        hasAccess = await this.authzService.hasOrgPermission(user.id, orgId, 'org:read');
      }
    }

    if (!hasAccess) {
      throw new ForbiddenException({
        error: {
          code: 'PERMISSION_DENIED',
          message: `You do not have the required permission (${requiredPermission}) to perform this action.`,
        },
      });
    }

    return true;
  }

  private isOrgPermission(permission: string): boolean {
    return permission.startsWith('org:') || permission === 'project:create';
  }
}
