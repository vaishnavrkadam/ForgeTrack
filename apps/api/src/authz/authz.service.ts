import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ORG_ROLE_PERMISSIONS, PROJECT_ROLE_PERMISSIONS } from './permissions';

@Injectable()
export class AuthzService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Verify if a user has a specific permission at the organization level
   */
  async hasOrgPermission(userId: string, orgId: string, permission: string): Promise<boolean> {
    // 1. Check if user is active and get their organization role
    const memberRes = await this.dataSource.query(
      `SELECT om.role, om.status as "memberStatus", u.status as "userStatus"
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2 LIMIT 1`,
      [orgId, userId],
    );

    if (memberRes.length === 0) return false;
    const member = memberRes[0];

    // Deactivated user or membership checks
    if (member.userStatus !== 'ACTIVE' || member.memberStatus !== 'ACTIVE') {
      return false;
    }

    // 2. Validate role permission mapping
    const role = member.role;
    const allowedPermissions = ORG_ROLE_PERMISSIONS[role] || [];
    return allowedPermissions.includes(permission);
  }

  /**
   * Verify if a user has a specific permission on a project resource
   */
  async hasProjectPermission(userId: string, orgId: string, projectId: string, permission: string): Promise<boolean> {
    // 1. Organization admins and owners automatically override all project permissions
    const memberRes = await this.dataSource.query(
      `SELECT om.role, om.status as "memberStatus", u.status as "userStatus"
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2 LIMIT 1`,
      [orgId, userId],
    );

    if (memberRes.length === 0) return false;
    const member = memberRes[0];

    if (member.userStatus !== 'ACTIVE' || member.memberStatus !== 'ACTIVE') {
      return false;
    }

    if (member.role === 'OWNER' || member.role === 'ADMIN') {
      return true;
    }

    // 2. Find user's role on the project
    const projectRes = await this.dataSource.query(
      `SELECT pm.role
       FROM project_members pm
       WHERE pm.project_id = $1 AND pm.user_id = $2 LIMIT 1`,
      [projectId, userId],
    );

    if (projectRes.length === 0) return false;
    const projectMember = projectRes[0];

    // 3. Validate project role permission mapping
    const role = projectMember.role;
    const allowedPermissions = PROJECT_ROLE_PERMISSIONS[role] || [];
    return allowedPermissions.includes(permission);
  }

  /**
   * Get issue context (orgId and projectId) for authorization resolution
   */
  async getIssueContext(issueId: string): Promise<{ orgId: string; projectId: string } | null> {
    const res = await this.dataSource.query(
      `SELECT organization_id as "orgId", project_id as "projectId" FROM issues WHERE id = $1 LIMIT 1`,
      [issueId],
    );
    return res.length > 0 ? res[0] : null;
  }
}
