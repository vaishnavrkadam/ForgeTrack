import { Controller, Get, Post, Patch, Body, Param, BadRequestException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CurrentUser, CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission, ProjectPermission } from '../authz/permissions';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto, CreateComponentDto, CreateVersionDto, CreateMilestoneDto } from './dto/create-metadata.dto';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';
import { CacheService } from '../common/cache.service';

@Controller()
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly cacheService: CacheService,
  ) {}

  @Post('organizations/:organizationId/projects')
  @RequirePermission(OrgPermission.PROJECT_CREATE)
  async createProject(
    @CurrentUser() user: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.createProject(orgId, user.id, dto);
    this.cacheService.del(`org-projects:${orgId}`);
    return { data };
  }

  @Post('projects/import-from-github')
  @RequirePermission(OrgPermission.PROJECT_CREATE)
  async importFromGitHub(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
    @Body('repoOwner') repoOwner: string,
    @Body('repoName') repoName: string,
    @Body('name') name?: string,
    @Body('key') key?: string,
    @Body('description') description?: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!repoOwner || !repoName) {
      throw new BadRequestException('Repository owner and name are required.');
    }
    const data = await this.projectService.importFromGitHub(org.id, user.id, repoOwner, repoName, name, key, description);
    this.cacheService.del(`org-projects:${org.id}`);
    return { data };
  }

  @Get('organizations/:organizationId/projects')
  @RequirePermission(OrgPermission.READ)
  async listProjects(
    @Param('organizationId') orgId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const cacheKey = `org-projects:${orgId}`;
    const cached = this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      return { data: cached };
    }
    const data = await this.projectService.listProjects(orgId);
    this.cacheService.set(cacheKey, data, 300);
    return { data };
  }

  @Get('projects/:projectId')
  @RequirePermission(ProjectPermission.READ)
  async getProject(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.getProject(projectId);
    return { data };
  }

  @Patch('projects/:projectId')
  @RequirePermission(ProjectPermission.UPDATE)
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() dto: any,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.updateProject(projectId, dto);
    return { data };
  }

  @Get('projects/:projectId/stats')
  @RequirePermission(ProjectPermission.READ)
  async getProjectStats(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.getProjectStats(projectId);
    return { data };
  }

  @Post('projects/:projectId/members')
  @RequirePermission(ProjectPermission.MANAGE_MEMBERS)
  async addMember(
    @Param('projectId') projectId: string,
    @Body() dto: AddMemberDto,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.projectService.addMember(projectId, dto);
    return { data: { success: true } };
  }

  @Get('projects/:projectId/members')
  @RequirePermission(ProjectPermission.READ)
  async listMembers(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.projectService.listMembers(projectId);
    return { data };
  }

  @Post('projects/:projectId/components')
  @RequirePermission(ProjectPermission.UPDATE)
  async createComponent(
    @Param('projectId') projectId: string,
    @Body() dto: CreateComponentDto,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.createComponent(projectId, dto);
    return { data };
  }

  @Get('projects/:projectId/components')
  @RequirePermission(ProjectPermission.READ)
  async listComponents(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.projectService.listComponents(projectId);
    return { data };
  }

  @Post('projects/:projectId/labels')
  @RequirePermission(ProjectPermission.UPDATE)
  async createLabel(
    @Param('projectId') projectId: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.createLabel(projectId, name, description);
    return { data };
  }

  @Get('projects/:projectId/labels')
  @RequirePermission(ProjectPermission.READ)
  async listLabels(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.projectService.listLabels(projectId);
    return { data };
  }

  @Post('projects/:projectId/versions')
  @RequirePermission(ProjectPermission.UPDATE)
  async createVersion(
    @Param('projectId') projectId: string,
    @Body() dto: CreateVersionDto,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.createVersion(projectId, dto);
    return { data };
  }

  @Get('projects/:projectId/versions')
  @RequirePermission(ProjectPermission.READ)
  async listVersions(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.projectService.listVersions(projectId);
    return { data };
  }

  @Post('projects/:projectId/milestones')
  @RequirePermission(ProjectPermission.UPDATE)
  async createMilestone(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.createMilestone(projectId, dto);
    return { data };
  }

  @Get('projects/:projectId/milestones')
  @RequirePermission(ProjectPermission.READ)
  async listMilestones(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.projectService.listMilestones(projectId);
    return { data };
  }

  @Get('projects/:projectId/defaults')
  @RequirePermission(ProjectPermission.READ)
  async getDefaults(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.projectService.getProjectDefaultMetadata(projectId);
    return { data };
  }
}
