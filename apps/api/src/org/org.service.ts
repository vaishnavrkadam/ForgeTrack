import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class OrgService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * List members of an organization
   */
  async listMembers(orgId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT om.id, om.user_id as "userId", u.email, u.display_name as "displayName", u.avatar_url as "avatarUrl", om.role, om.status, om.joined_at as "joinedAt"
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.status = 'ACTIVE'`,
      [orgId],
    );
  }

  /**
   * Create an invitation for an email address to join an organization
   */
  async createInvitation(orgId: string, email: string, role: string, invitedByUserId: string): Promise<{ id: string; email: string; token: string }> {
    const emailLower = email.toLowerCase();

    // Check if user is already a member
    const existingMember = await this.dataSource.query(
      `SELECT om.id FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND u.email = $2 AND om.status = 'ACTIVE' LIMIT 1`,
      [orgId, emailLower],
    );

    if (existingMember.length > 0) {
      throw new BadRequestException({
        error: {
          code: 'ALREADY_MEMBER',
          message: 'The user is already an active member of this organization.',
        },
      });
    }

    // Generate random raw invitation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    const invRes = await this.dataSource.query(
      `INSERT INTO organization_invitations (organization_id, email, role, token_hash, expires_at, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email`,
      [orgId, emailLower, role, tokenHash, expiresAt, invitedByUserId],
    );
    const invitation = invRes[0];

    return {
      id: invitation.id,
      email: invitation.email,
      token: rawToken,
    };
  }
}
