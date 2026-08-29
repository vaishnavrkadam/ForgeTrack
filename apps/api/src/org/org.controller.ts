import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { OrgService } from './org.service';
import { CurrentUser, Public } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('organizations/:organizationId/members')
  @RequirePermission(OrgPermission.READ)
  async getMembers(
    @Param('organizationId') paramOrgId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.orgService.listMembers(paramOrgId);
    return { data };
  }

  @Post('organizations/:organizationId/invitations')
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

  /**
   * Create an instant shareable invitation link
   */
  @Post('organizations/:organizationId/invitations/link')
  @RequirePermission(OrgPermission.INVITE)
  async createInviteLink(
    @CurrentUser() user: any,
    @Param('organizationId') paramOrgId: string,
    @Body('role') role: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.orgService.createInviteLink(paramOrgId, role || 'MEMBER', user.id);
    return { data };
  }

  /**
   * Public preview of invitation token before accepting
   */
  @Public()
  @Get('invitations/preview')
  async previewInvitation(
    @Query('token') token: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!token) {
      throw new BadRequestException('Invitation token is required.');
    }
    const data = await this.orgService.getInvitationPreview(token);
    return { data };
  }

  /**
   * Global accept invitation endpoint for logged in users
   */
  @Post('invitations/accept/raw')
  async acceptRawInvitation(
    @CurrentUser() user: any,
    @Body('token') token: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!token) {
      throw new BadRequestException('Invitation token is required.');
    }
    const data = await this.orgService.acceptInvitation(token, user.id);
    return { data };
  }

  @Post('invitations/accept')
  async acceptGlobalInvitation(
    @CurrentUser() user: any,
    @Body('token') token: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!token) {
      throw new BadRequestException('Invitation token is required.');
    }
    const data = await this.orgService.acceptInvitation(token, user.id);
    return { data };
  }
}
