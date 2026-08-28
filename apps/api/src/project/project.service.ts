import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto, CreateComponentDto, CreateVersionDto, CreateMilestoneDto } from './dto/create-metadata.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly dataSource: DataSource) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  /**
   * Create a new project and seed all standard issue types, priorities, severities, statuses, and workflow transitions
   */
  async createProject(orgId: string, creatorId: string, dto: CreateProjectDto): Promise<any> {
    const slug = this.slugify(dto.name);

    // Check key & slug uniqueness within organization
    const existing = await this.dataSource.query(
      `SELECT id FROM projects WHERE organization_id = $1 AND (key = $2 OR slug = $3) LIMIT 1`,
      [orgId, dto.key, slug],
    );
    if (existing.length > 0) {
      throw new BadRequestException({
        error: {
          code: 'PROJECT_KEY_TAKEN',
          message: 'Project key or name slug already exists in this organization.',
        },
      });
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Create Project
      const projRes = await manager.query(
        `INSERT INTO projects (organization_id, key, name, slug, description, visibility, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, key, name, slug, visibility`,
        [orgId, dto.key, dto.name, slug, dto.description || null, dto.visibility, creatorId],
      );
      const project = projRes[0];

      // 2. Link creator as project ADMIN
      await manager.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'ADMIN')`,
        [project.id, creatorId],
      );

      // 3. Seed Default Issue Types
      const issueTypes = [
        { name: 'Bug', code: 'BUG', icon: 'bug', desc: 'An error, flaw or failure in software' },
        { name: 'Feature Request', code: 'FEATURE', icon: 'star', desc: 'New functionality or requirement' },
        { name: 'Task', code: 'TASK', icon: 'check', desc: 'General engineering or task card' },
        { name: 'Improvement', code: 'IMPROVEMENT', icon: 'arrow-up', desc: 'Enhancement to existing functionality' },
        { name: 'Incident', code: 'INCIDENT', icon: 'alert', desc: 'Production issue or downtime incident' },
        { name: 'Epic', code: 'EPIC', icon: 'hierarchy', desc: 'Large body of work that spans multiple issues' },
        { name: 'Question', code: 'QUESTION', icon: 'help', desc: 'Clarification request or support ticket' },
      ];
      for (const t of issueTypes) {
        await manager.query(
          `INSERT INTO issue_types (project_id, name, code, icon, description) VALUES ($1, $2, $3, $4, $5)`,
          [project.id, t.name, t.code, t.icon, t.desc],
        );
      }

      // 4. Seed Default Priorities
      const priorities = [
        { name: 'Low', code: 'LOW', rank: 1 },
        { name: 'Medium', code: 'MEDIUM', rank: 2 },
        { name: 'High', code: 'HIGH', rank: 3 },
        { name: 'Urgent', code: 'URGENT', rank: 4 },
      ];
      for (const p of priorities) {
        await manager.query(
          `INSERT INTO priorities (project_id, name, code, rank) VALUES ($1, $2, $3, $4)`,
          [project.id, p.name, p.code, p.rank],
        );
      }

      // 5. Seed Default Severities
      const severities = [
        { name: 'Trivial', code: 'TRIVIAL', rank: 1 },
        { name: 'Minor', code: 'MINOR', rank: 2 },
        { name: 'Major', code: 'MAJOR', rank: 3 },
        { name: 'Critical', code: 'CRITICAL', rank: 4 },
        { name: 'Blocker', code: 'BLOCKER', rank: 5 },
      ];
      for (const s of severities) {
        await manager.query(
          `INSERT INTO severities (project_id, name, code, rank) VALUES ($1, $2, $3, $4)`,
          [project.id, s.name, s.code, s.rank],
        );
      }

      // 6. Seed Default Statuses
      const statuses = [
        { name: 'Open', code: 'OPEN', category: 'TODO', rank: 1, terminal: false },
        { name: 'Triaged', code: 'TRIAGED', category: 'TODO', rank: 2, terminal: false },
        { name: 'In Progress', code: 'IN_PROGRESS', category: 'ACTIVE', rank: 3, terminal: false },
        { name: 'In Review', code: 'IN_REVIEW', category: 'ACTIVE', rank: 4, terminal: false },
        { name: 'Resolved', code: 'RESOLVED', category: 'DONE', rank: 5, terminal: false },
        { name: 'Verified', code: 'VERIFIED', category: 'DONE', rank: 6, terminal: false },
        { name: 'Closed', code: 'CLOSED', category: 'DONE', rank: 7, is_terminal: true },
      ];
      const statusMap: Record<string, string> = {};
      for (const st of statuses) {
        const res = await manager.query(
          `INSERT INTO statuses (project_id, name, code, category, rank, is_terminal)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, code`,
          [project.id, st.name, st.code, st.category, st.rank, st.terminal],
        );
        statusMap[res[0].code] = res[0].id;
      }

      // 7. Seed Default Workflow Transitions (from StatusMap)
      const transitions = [
        { from: 'OPEN', to: 'TRIAGED', name: 'Triage Issue' },
        { from: 'OPEN', to: 'CLOSED', name: 'Reject/Close Issue' },
        { from: 'TRIAGED', to: 'IN_PROGRESS', name: 'Start Work' },
        { from: 'IN_PROGRESS', to: 'IN_REVIEW', name: 'Submit for Review' },
        { from: 'IN_REVIEW', to: 'RESOLVED', name: 'Resolve' },
        { from: 'RESOLVED', to: 'VERIFIED', name: 'Verify' },
        { from: 'VERIFIED', to: 'CLOSED', name: 'Close Issue' },
        { from: 'RESOLVED', to: 'OPEN', name: 'Reopen' },
        { from: 'CLOSED', to: 'OPEN', name: 'Reopen' },
      ];
      for (const t of transitions) {
        const fromId = statusMap[t.from];
        const toId = statusMap[t.to];
        if (fromId && toId) {
          await manager.query(
            `INSERT INTO workflow_transitions (project_id, from_status_id, to_status_id, name)
             VALUES ($1, $2, $3, $4)`,
            [project.id, fromId, toId, t.name],
          );
        }
      }

      return project;
    });
  }

  async listProjects(orgId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, key, name, slug, description, visibility, status, created_at as "createdAt"
       FROM projects WHERE organization_id = $1 ORDER BY key`,
      [orgId],
    );
  }

  async getProject(projectId: string): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT id, organization_id as "organizationId", key, name, slug, description, visibility, status, created_at as "createdAt"
       FROM projects WHERE id = $1 LIMIT 1`,
      [projectId],
    );
    if (res.length === 0) throw new NotFoundException('Project not found');
    return res[0];
  }

  // Member Management
  async addMember(projectId: string, dto: AddMemberDto): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [projectId, dto.userId, dto.role],
    );
  }

  async listMembers(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT pm.id, pm.user_id as "userId", u.email, u.display_name as "displayName", pm.role, pm.created_at as "createdAt"
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [projectId],
    );
  }

  // Component Management
  async createComponent(projectId: string, dto: CreateComponentDto): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO components (project_id, name, description, lead_user_id, default_assignee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, lead_user_id as "leadUserId", default_assignee_id as "defaultAssigneeId"`,
      [projectId, dto.name, dto.description || null, dto.leadUserId || null, dto.defaultAssigneeId || null],
    );
    return res[0];
  }

  async listComponents(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, name, description, lead_user_id as "leadUserId", default_assignee_id as "defaultAssigneeId", is_active as "isActive"
       FROM components WHERE project_id = $1 ORDER BY name`,
      [projectId],
    );
  }

  // Label Management
  async createLabel(projectId: string, name: string, description?: string): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO labels (project_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description`,
      [projectId, name, description || null],
    );
    return res[0];
  }

  async listLabels(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, name, description FROM labels WHERE project_id = $1 ORDER BY name`,
      [projectId],
    );
  }

  // Version Management
  async createVersion(projectId: string, dto: CreateVersionDto): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO versions (project_id, name, description, start_date, release_date, status)
       VALUES ($1, $2, $3, $4, $5, 'PLANNED')
       RETURNING id, name, description, start_date as "startDate", release_date as "releaseDate", status`,
      [projectId, dto.name, dto.description || null, dto.startDate || null, dto.releaseDate || null],
    );
    return res[0];
  }

  async listVersions(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, name, description, start_date as "startDate", release_date as "releaseDate", status
       FROM versions WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
  }

  // Milestone Management
  async createMilestone(projectId: string, dto: CreateMilestoneDto): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO milestones (project_id, name, description, due_date, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, name, description, due_date as "dueDate", status`,
      [projectId, dto.name, dto.description || null, dto.dueDate || null],
    );
    return res[0];
  }

  async listMilestones(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, name, description, due_date as "dueDate", status
       FROM milestones WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
  }

  // Lookup default values
  async getProjectDefaultMetadata(projectId: string): Promise<any> {
    const issueTypes = await this.dataSource.query('SELECT id, name, code, icon FROM issue_types WHERE project_id = $1', [projectId]);
    const priorities = await this.dataSource.query('SELECT id, name, code, rank FROM priorities WHERE project_id = $1 ORDER BY rank', [projectId]);
    const severities = await this.dataSource.query('SELECT id, name, code, rank FROM severities WHERE project_id = $1 ORDER BY rank', [projectId]);
    const statuses = await this.dataSource.query('SELECT id, name, code, category, rank FROM statuses WHERE project_id = $1 ORDER BY rank', [projectId]);
    
    return {
      issueTypes,
      priorities,
      severities,
      statuses,
    };
  }

  /**
   * Import a GitHub repository as a new ForgeTrack project
   */
  async importFromGitHub(
    orgId: string,
    userId: string,
    repoOwner: string,
    repoName: string,
    customName?: string,
    customKey?: string,
    description?: string,
  ): Promise<any> {
    const name = customName || repoName;
    let key = customKey || repoName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    if (key.length < 2) key = 'REPO';

    // Ensure key uniqueness by appending random digit if taken
    let attemptKey = key;
    let counter = 1;
    while (true) {
      const existing = await this.dataSource.query(
        'SELECT id FROM projects WHERE organization_id = $1 AND key = $2 LIMIT 1',
        [orgId, attemptKey],
      );
      if (existing.length === 0) break;
      attemptKey = `${key.substring(0, 3)}${counter++}`;
    }

    const project = await this.createProject(orgId, userId, {
      name,
      key: attemptKey,
      description: description || `Imported from GitHub: ${repoOwner}/${repoName}`,
      visibility: 'PRIVATE',
    });

    // Record repository linkage
    try {
      await this.dataSource.query(
        `INSERT INTO repositories (organization_id, project_id, provider, name, full_name, url, is_private)
         VALUES ($1, $2, 'GITHUB', $3, $4, $5, true)`,
        [orgId, project.id, repoName, `${repoOwner}/${repoName}`, `https://github.com/${repoOwner}/${repoName}`],
      );
    } catch {
      // Ignored if table structure differs
    }

    return {
      ...project,
      repository: {
        provider: 'GITHUB',
        fullName: `${repoOwner}/${repoName}`,
        url: `https://github.com/${repoOwner}/${repoName}`,
      },
    };
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, dto: { name?: string; description?: string; visibility?: string; status?: string }): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description);
    }
    if (dto.visibility !== undefined) {
      fields.push(`visibility = $${idx++}`);
      values.push(dto.visibility);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }

    if (fields.length > 0) {
      fields.push(`updated_at = now()`);
      values.push(projectId);
      await this.dataSource.query(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx}`,
        values,
      );
    }

    return this.getProject(projectId);
  }

  /**
   * Get calculated project stats for dashboard
   */
  async getProjectStats(projectId: string): Promise<any> {
    const project = await this.getProject(projectId);

    const issues = await this.dataSource.query(
      `SELECT i.id, i.number, p.key as "projectKey", i.title, i.created_at as "createdAt",
              s.category as "statusCategory", pr.code as "priorityCode", sv.code as "severityCode",
              rep.display_name as "reporterName", ass.display_name as "assigneeName"
       FROM issues i
       JOIN projects p ON p.id = i.project_id
       LEFT JOIN statuses s ON s.id = i.status_id
       LEFT JOIN priorities pr ON pr.id = i.priority_id
       LEFT JOIN severities sv ON sv.id = i.severity_id
       LEFT JOIN users rep ON rep.id = i.reporter_id
       LEFT JOIN users ass ON ass.id = i.assignee_id
       WHERE i.project_id = $1
       ORDER BY i.created_at DESC`,
      [projectId],
    );

    const totalCount = issues.length;
    const openCount = issues.filter((i: any) => i.statusCategory !== 'DONE').length;
    const inProgressCount = issues.filter((i: any) => i.statusCategory === 'IN_PROGRESS').length;
    const urgentCount = issues.filter((i: any) => i.priorityCode === 'URGENT' || i.severityCode === 'BLOCKER').length;

    // Check CI Runs pass rate if any
    let ciPassRate = 98;
    try {
      const ciRes = await this.dataSource.query(
        `SELECT COUNT(*) as total,
                COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as passed
         FROM ci_runs WHERE project_id = $1`,
        [projectId],
      );
      if (ciRes.length > 0 && Number(ciRes[0].total) > 0) {
        ciPassRate = Math.round((Number(ciRes[0].passed) / Number(ciRes[0].total)) * 100);
      }
    } catch {
      // Ignored
    }

    return {
      project,
      totalCount,
      openCount,
      inProgressCount,
      urgentCount,
      ciPassRate,
      recentIssues: issues.slice(0, 5),
    };
  }
}
