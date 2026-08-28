import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CurrentUser } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('issues/:issueId/comments')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async addComment(
    @CurrentUser() user: any,
    @Param('issueId') issueId: string,
    @Body('body') body: string,
    @Body('isPrivate') isPrivate?: boolean,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.commentService.addComment(issueId, user.id, body || '', !!isPrivate);
    return { data };
  }

  @Get('issues/:issueId/comments')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async listComments(
    @CurrentUser() user: any,
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.commentService.listComments(issueId, user.id);
    return { data };
  }

  @Patch('comments/:commentId')
  async editComment(
    @CurrentUser() user: any,
    @Param('commentId') commentId: string,
    @Body('body') body: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.commentService.editComment(commentId, user.id, body || '');
    return { data };
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @CurrentUser() user: any,
    @Param('commentId') commentId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.commentService.deleteComment(commentId, user.id);
    return { data: { success: true } };
  }

  @Post('issues/:issueId/watch')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async toggleWatching(
    @CurrentUser() user: any,
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<{ watching: boolean }>> {
    const data = await this.commentService.toggleWatching(issueId, user.id);
    return { data };
  }

  @Get('issues/:issueId/watchers')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async listWatchers(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.commentService.listWatchers(issueId);
    return { data };
  }
}
