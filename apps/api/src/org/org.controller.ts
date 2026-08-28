import { Controller, Get, Post, Body, Param, BadRequestException } from '@nestjs/common';
import { OrgService } from './org.service';
import { CurrentUser } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller('organizations/:organizationId')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('members')
  @RequirePermission(OrgPermission.READ)
  async getMembers(
    @Param('organizationId') paramOrgId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.orgService.listMembers(paramOrgId);
    return { data };
  }

  @Post('invitations')
  @RequirePermission(OrgPermission.INVITE)
  async inviteMember(
    @CurrentUser() user: any,
    @Param('organizationId') paramOrgId: string,
    @Body('email') email: string,
    @Body('role') role: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!email || !role) {
      throw new BadRequestException('Email address and role are required.');
    }

    const data = await this.orgService.createInvitation(paramOrgId, email, role, user.id);
    return { data };
  }
}
