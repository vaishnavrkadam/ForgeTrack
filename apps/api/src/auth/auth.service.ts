import { Injectable, UnauthorizedException, BadRequestException, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../notification/email.service';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    oauthProvider?: string;
    status: string;
  };
  organization?: {
    id: string;
    slug: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  /**
   * Helper to slugify organization names safely
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .concat('-', Math.floor(1000 + Math.random() * 9000).toString());
  }

  /**
   * Helper to hash session/API tokens
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Register a new user and bootstrap their default organization
   */
  async register(dto: RegisterDto): Promise<AuthContext> {
    const emailLower = dto.email.toLowerCase();

    // Check if user already exists
    const existingUser = await this.dataSource.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [emailLower],
    );

    if (existingUser.length > 0) {
      throw new BadRequestException({
        error: {
          code: 'EMAIL_TAKEN',
          message: 'A user with this email address already exists.',
        },
      });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(dto.password, salt);

    // Run transaction
    return this.dataSource.transaction(async (manager) => {
      // 1. Create User
      const userRes = await manager.query(
        `INSERT INTO users (email, display_name, password_hash, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         RETURNING id, email, display_name, status`,
        [emailLower, dto.displayName, passwordHash],
      );
      const user = userRes[0];

      // 2. Create default Organization
      const orgName = `${dto.displayName}'s Workspace`;
      const orgSlug = this.slugify(dto.displayName);
      const orgRes = await manager.query(
        `INSERT INTO organizations (slug, name, description)
         VALUES ($1, $2, 'Default organization created on sign up')
         RETURNING id, slug, name`,
        [orgSlug, orgName],
      );
      const org = orgRes[0];

      // 3. Link User as OWNER
      await manager.query(
        `INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
         VALUES ($1, $2, 'OWNER', 'ACTIVE', now())`,
        [org.id, user.id],
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          status: user.status,
        },
        organization: {
          id: org.id,
          slug: org.slug,
          name: org.name,
          role: 'OWNER',
        },
      };
    });
  }

  /**
   * Verify credentials and start a session
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{ token: string; context: AuthContext }> {
    const emailLower = dto.email.toLowerCase();

    // Query user and their primary organization membership
    const userRes = await this.dataSource.query(
      `SELECT id, email, display_name, avatar_url, oauth_provider, password_hash, status FROM users WHERE email = $1 LIMIT 1`,
      [emailLower],
    );

    if (userRes.length === 0) {
      throw new UnauthorizedException({
        error: {
          code: 'AUTH_INVALID',
          message: 'Invalid email or password.',
        },
      });
    }

    const user = userRes[0];
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        error: {
          code: 'USER_DEACTIVATED',
          message: 'This user account is no longer active.',
        },
      });
    }

    // Check password
    const passwordValid = user.password_hash ? bcrypt.compareSync(dto.password, user.password_hash) : false;
    if (!passwordValid) {
      throw new UnauthorizedException({
        error: {
          code: 'AUTH_INVALID',
          message: 'Invalid email or password.',
        },
      });
    }

    // Fetch primary/latest organization for context
    const memberRes = await this.dataSource.query(
      `SELECT om.organization_id, om.role, o.slug, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'ACTIVE'
       ORDER BY om.joined_at DESC LIMIT 1`,
      [user.id],
    );
    const membership = memberRes[0];

    // Generate random raw token (64 characters hex)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // Save session in DB
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days expiration
    await this.dataSource.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, tokenHash, expiresAt, ipAddress || null, userAgent || null],
    );

    // Update last login
    await this.dataSource.query(
      'UPDATE users SET last_login_at = now() WHERE id = $1',
      [user.id],
    );

    return {
      token: rawToken,
      context: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url || undefined,
          oauthProvider: user.oauth_provider || undefined,
          status: user.status,
        },
        organization: membership
          ? {
              id: membership.organization_id,
              slug: membership.slug,
              name: membership.name,
              role: membership.role,
            }
          : undefined,
      },
    };
  }

  /**
   * Terminate user session
   */
  async logout(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.dataSource.query(
      `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  /**
   * Validate a session token
   */
  async validateSession(token: string): Promise<AuthContext | null> {
    const tokenHash = this.hashToken(token);

    // Fetch active session
    const sessionRes = await this.dataSource.query(
      `SELECT s.user_id, u.email, u.display_name, u.avatar_url, u.oauth_provider, u.status
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND s.revoked_at IS NULL LIMIT 1`,
      [tokenHash],
    );

    if (sessionRes.length === 0) return null;
    const session = sessionRes[0];

    // Fetch organization memberships
    const memberRes = await this.dataSource.query(
      `SELECT om.organization_id, om.role, o.slug, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'ACTIVE'
       ORDER BY om.joined_at DESC LIMIT 1`,
      [session.user_id],
    );
    const membership = memberRes[0];

    return {
      user: {
        id: session.user_id,
        email: session.email,
        displayName: session.display_name,
        avatarUrl: session.avatar_url || undefined,
        oauthProvider: session.oauth_provider || undefined,
        status: session.status,
      },
      organization: membership
        ? {
            id: membership.organization_id,
            slug: membership.slug,
            name: membership.name,
            role: membership.role,
          }
        : undefined,
    };
  }

  /**
   * Validate a client API Token (prefix-checked FT-...)
   */
  async validateApiToken(token: string): Promise<AuthContext | null> {
    // Expected format: prefix + hash lookup
    // API specification indicates standard Authorization: Bearer <token>
    // prefix is stored in api_tokens as token_prefix (e.g. first 8 chars)
    const prefix = token.substring(0, 8);
    const tokenHash = this.hashToken(token);

    const tokenRes = await this.dataSource.query(
      `SELECT t.user_id, t.organization_id, t.scopes, u.email, u.display_name, u.status, o.slug, o.name, om.role
       FROM api_tokens t
       JOIN users u ON u.id = t.user_id
       JOIN organizations o ON o.id = t.organization_id
       JOIN organization_members om ON om.organization_id = o.id AND om.user_id = u.id
       WHERE t.token_hash = $1 AND t.token_prefix = $2 
       AND (t.expires_at IS NULL OR t.expires_at > now()) 
       AND t.revoked_at IS NULL LIMIT 1`,
      [tokenHash, prefix],
    );

    if (tokenRes.length === 0) return null;
    const tokenData = tokenRes[0];

    return {
      user: {
        id: tokenData.user_id,
        email: tokenData.email,
        displayName: tokenData.display_name,
        status: tokenData.status,
      },
      organization: {
        id: tokenData.organization_id,
        slug: tokenData.slug,
        name: tokenData.name,
        role: tokenData.role,
      },
    };
  }

  /**
   * Create a new scoped API Token
   */
  async createApiToken(userId: string, orgId: string, name: string, scopes: string[]): Promise<string> {
    // Generate a secure raw token starting with ft_ prefix
    const rawToken = 'ft_' + crypto.randomBytes(24).toString('hex');
    const prefix = rawToken.substring(0, 8);
    const tokenHash = this.hashToken(rawToken);

    await this.dataSource.query(
      `INSERT INTO api_tokens (organization_id, user_id, name, token_prefix, token_hash, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orgId,
        userId,
        name,
        prefix,
        tokenHash,
        JSON.stringify(scopes),
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year expiration
      ],
    );

    return rawToken;
  }

  /**
   * List API Tokens for an organization
   */
  async listApiTokens(orgId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, name, token_prefix, scopes, expires_at, last_used_at, created_at
       FROM api_tokens
       WHERE organization_id = $1 AND revoked_at IS NULL`,
      [orgId],
    );
  }

  /**
   * Revoke an API Token
   */
  async revokeApiToken(tokenId: string, orgId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE api_tokens SET revoked_at = now() WHERE id = $1 AND organization_id = $2`,
      [tokenId, orgId],
    );
  }

  private getSecret(): string {
    return process.env.SESSION_SECRET || 'forgetrack-default-secret-key-32-chars';
  }

  private generateSignedToken(userId: string, type: 'verify' | 'reset', expiresMs: number): string {
    const payload = JSON.stringify({ userId, type, expiresAt: Date.now() + expiresMs });
    const base64Payload = Buffer.from(payload).toString('base64url');
    const signature = crypto.createHmac('sha256', this.getSecret()).update(base64Payload).digest('hex');
    return `${base64Payload}.${signature}`;
  }

  private verifySignedToken(token: string, type: 'verify' | 'reset'): string {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Invalid token format');
    }
    const [base64Payload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', this.getSecret()).update(base64Payload).digest('hex');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Token signature verification failed');
    }
    try {
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
      if (payload.type !== type) {
        throw new BadRequestException('Token type mismatch');
      }
      if (Date.now() > payload.expiresAt) {
        throw new BadRequestException('Token has expired');
      }
      return payload.userId;
    } catch {
      throw new BadRequestException('Malformed token payload');
    }
  }

  /**
   * Request password reset link
   */
  async requestPasswordReset(email: string): Promise<void> {
    const userRes = await this.dataSource.query(
      'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    if (userRes.length === 0) {
      // Return quietly to prevent account enumeration
      return;
    }
    const user = userRes[0];
    const token = this.generateSignedToken(user.id, 'reset', 3600000); // 1 hour TTL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/auth/reset-password?token=${token}`;
    
    if (this.emailService) {
      await this.emailService.sendPasswordReset(email, link);
    } else {
      console.log(`[SMTP Mailer] Password reset link sent to ${email}: ${link}`);
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = this.verifySignedToken(token, 'reset');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.dataSource.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [passwordHash, userId],
    );
  }

  /**
   * Send verification link
   */
  async requestVerification(userId: string): Promise<void> {
    const userRes = await this.dataSource.query('SELECT email FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (userRes.length === 0) return;
    const user = userRes[0];
    const token = this.generateSignedToken(userId, 'verify', 86400000); // 24 hours TTL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/auth/verify-email?token=${token}`;
    
    if (this.emailService) {
      await this.emailService.sendVerificationEmail(user.email, link);
    } else {
      console.log(`[SMTP Mailer] Email verification link sent to ${user.email}: ${link}`);
    }
  }

  /**
   * Verify email verification token
   */
  async verifyEmail(token: string): Promise<void> {
    const userId = this.verifySignedToken(token, 'verify');
    await this.dataSource.query(
      'UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1',
      [userId],
    );
  }
}
