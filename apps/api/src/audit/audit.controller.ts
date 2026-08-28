import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('organizations/:organizationId/audit')
  @RequirePermission(OrgPermission.READ)
  async getAuditTimeline(
    @Param('organizationId') orgId: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.auditService.searchTimeline(orgId, {
      actorUserId,
      entityType,
      action,
      startDate,
      endDate,
    });
    return { data };
  }
}
