import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { EmailService } from '../notification/email.service';

@Injectable()
export class OrgService {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  /**
   * List members of an organization
   */
  async listMembers(orgId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT om.id, om.user_id as "userId", u.email, u.display_name as "displayName", u.avatar_url as "avatarUrl", om.role, om.status, om.joined_at as "joinedAt"
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.status = 'ACTIVE'
       ORDER BY om.joined_at ASC`,
      [orgId],
    );
  }

  /**
   * Create a shareable invitation link for an organization
   */
  async createInviteLink(orgId: string, role: string, invitedByUserId: string): Promise<any> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    const placeholderEmail = `link-${rawToken.substring(0, 10)}@invite.internal`;

    const invRes = await this.dataSource.query(
      `INSERT INTO organization_invitations (organization_id, email, role, token_hash, expires_at, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, role`,
      [orgId, placeholderEmail, role || 'MEMBER', tokenHash, expiresAt, invitedByUserId],
    );

    const orgRes = await this.dataSource.query('SELECT name, slug FROM organizations WHERE id = $1 LIMIT 1', [orgId]);

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const inviteUrl = `${frontendUrl}/join?token=${rawToken}`;

    return {
      id: invRes[0].id,
      role: invRes[0].role,
      token: rawToken,
      inviteUrl,
      organizationName: orgRes[0]?.name || 'Workspace',
      organizationSlug: orgRes[0]?.slug,
    };
  }

  /**
   * Create an email invitation to join an organization
   */
  async createInvitation(orgId: string, email: string, role: string, invitedByUserId: string): Promise<{ id: string; email: string; token: string; inviteUrl: string }> {
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

    // Fetch inviter and org details for email
    const orgRes = await this.dataSource.query('SELECT name FROM organizations WHERE id = $1 LIMIT 1', [orgId]);
    const inviterRes = await this.dataSource.query('SELECT display_name FROM users WHERE id = $1 LIMIT 1', [invitedByUserId]);
    const orgName = orgRes[0]?.name || 'ForgeTrack Workspace';
    const inviterName = inviterRes[0]?.display_name || 'A team member';

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

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const inviteUrl = `${frontendUrl}/join?token=${rawToken}`;

    if (this.emailService) {
      try {
        await this.emailService.sendInvitation(emailLower, inviterName, orgName, inviteUrl);
      } catch {
        // Fallback gracefully without blocking the response
      }
    }

    return {
      id: invitation.id,
      email: invitation.email,
      token: rawToken,
      inviteUrl,
    };
  }

  /**
   * Preview an invitation details before accepting
   */
  async getInvitationPreview(rawToken: string): Promise<any> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invRes = await this.dataSource.query(
      `SELECT i.id, i.organization_id as "organizationId", i.role, i.email, i.expires_at as "expiresAt", i.accepted_at as "acceptedAt",
              o.name as "organizationName", o.slug as "organizationSlug",
              u.display_name as "inviterName"
       FROM organization_invitations i
       JOIN organizations o ON o.id = i.organization_id
       LEFT JOIN users u ON u.id = i.invited_by
       WHERE i.token_hash = $1 LIMIT 1`,
      [tokenHash],
    );

    if (invRes.length === 0) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    const inv = invRes[0];
    const isExpired = new Date(inv.expiresAt) < new Date();
    const isAlreadyAccepted = !!inv.acceptedAt && !inv.email.endsWith('@invite.internal');

    return {
      id: inv.id,
      organizationId: inv.organizationId,
      organizationName: inv.organizationName,
      organizationSlug: inv.organizationSlug,
      inviterName: inv.inviterName || 'Team Admin',
      role: inv.role,
      isExpired,
      isAccepted: isAlreadyAccepted,
      isValid: !isExpired && !isAlreadyAccepted,
    };
  }

  /**
   * Accept an invitation using its raw token
   */
  async acceptInvitation(rawToken: string, userId: string): Promise<any> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invRes = await this.dataSource.query(
      `SELECT id, organization_id, email, role, expires_at, accepted_at
       FROM organization_invitations
       WHERE token_hash = $1 LIMIT 1`,
      [tokenHash],
    );

    if (invRes.length === 0) {
      throw new BadRequestException('Invalid invitation token');
    }

    const invitation = invRes[0];
    if (invitation.accepted_at && !invitation.email.endsWith('@invite.internal')) {
      throw new BadRequestException('This invitation has already been accepted.');
    }
    if (new Date(invitation.expires_at) < new Date()) {
      throw new BadRequestException('This invitation has expired.');
    }

    return this.dataSource.transaction(async (manager) => {
      // Add or update membership
      await manager.query(
        `INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
         VALUES ($1, $2, $3, 'ACTIVE', now())
         ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE'`,
        [invitation.organization_id, userId, invitation.role],
      );

      // Mark invitation accepted if it is a 1-to-1 email invite
      if (!invitation.email.endsWith('@invite.internal')) {
        await manager.query(
          `UPDATE organization_invitations SET accepted_at = now() WHERE id = $1`,
          [invitation.id],
        );
      }

      const orgRes = await manager.query(
        `SELECT id, slug, name FROM organizations WHERE id = $1 LIMIT 1`,
        [invitation.organization_id],
      );

      return {
        success: true,
        organization: orgRes[0],
        role: invitation.role,
      };
    });
  }
}
