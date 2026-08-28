import { Controller, Get, Post, Delete, Param, UseInterceptors, UploadedFile, Res, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentService } from './attachment.service';
import { CurrentUser } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';
import { DataSource } from 'typeorm';

@Controller()
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('issues/:issueId/attachments')
  @RequirePermission(ProjectPermission.UPDATE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @CurrentUser() user: any,
    @Param('issueId') issueId: string,
    @UploadedFile() file: any,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!file) throw new BadRequestException('No file uploaded');
    const data = await this.attachmentService.uploadAttachment(issueId, user.id, file);
    return { data };
  }

  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @CurrentUser() user: any,
    @Param('attachmentId') attachmentId: string,
    @Res() response: Response,
  ): Promise<void> {
    // IDOR check: Resolve project_id of the target attachment and verify reader access
    const res = await this.dataSource.query(
      `SELECT i.project_id as "projectId"
       FROM attachments a
       JOIN issues i ON i.id = a.issue_id
       WHERE a.id = $1 LIMIT 1`,
      [attachmentId],
    );
    if (res.length === 0) throw new NotFoundException('Attachment not found');
    const projectId = res[0].projectId;

    // Check project membership/permissions
    const memberRes = await this.dataSource.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
      [projectId, user.id],
    );
    
    // Also check Org Owners/Admins override (by querying org context)
    const orgRes = await this.dataSource.query(
      `SELECT p.organization_id as "orgId" FROM projects p WHERE p.id = $1 LIMIT 1`,
      [projectId],
    );
    const orgId = orgRes[0].orgId;
    const orgMemberRes = await this.dataSource.query(
      `SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1`,
      [orgId, user.id],
    );
    
    const isOrgAdmin = orgMemberRes.length > 0 && (orgMemberRes[0].role === 'OWNER' || orgMemberRes[0].role === 'ADMIN');
    const isProjectMember = memberRes.length > 0;

    if (!isProjectMember && !isOrgAdmin) {
      throw new ForbiddenException('You do not have access to this project\'s attachments');
    }

    const att = await this.attachmentService.getAttachment(attachmentId);
    response.setHeader('Content-Type', att.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${att.filename}"`);
    response.sendFile(att.filePath);
  }

  @Delete('attachments/:attachmentId')
  async deleteAttachment(
    @CurrentUser() user: any,
    @Param('attachmentId') attachmentId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.attachmentService.deleteAttachment(attachmentId, user.id);
    return { data: { success: true } };
  }
}

// Inline fallback imports
import { BadRequestException } from '@nestjs/common';
