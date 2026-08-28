import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { AuthContext } from './auth.service';

export interface OAuthUserProfile {
  provider: 'github' | 'google';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  accessToken?: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(private readonly dataSource: DataSource) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .concat('-', Math.floor(1000 + Math.random() * 9000).toString());
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getRedirectBaseUrl(): string {
    const raw =
      process.env.OAUTH_REDIRECT_BASE_URL ||
      process.env.BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      `http://localhost:${process.env.PORT || 3001}`;
    
    let sanitized = raw.trim();
    sanitized = sanitized.replace(/^https?:\/\/(https?:\/\/)+/i, '$1');
    sanitized = sanitized.replace(/^https?\/\//i, 'https://');
    if (!/^https?:\/\//i.test(sanitized)) {
      sanitized = `https://${sanitized}`;
    }
    return sanitized.replace(/\/+$/, '');
  }

  getGitHubAuthUrl(state?: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('GitHub OAuth is not configured on the server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');
    }
    const redirectUri = encodeURIComponent(`${this.getRedirectBaseUrl()}/api/v1/auth/github/callback`);
    const scope = encodeURIComponent('read:user user:email repo');
    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}${stateParam}`;
  }

  async exchangeGitHubCode(code: string): Promise<OAuthUserProfile> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('GitHub OAuth credentials are not configured on the server.');
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      this.logger.error('Failed to obtain GitHub access token:', tokenData);
      throw new BadRequestException('Invalid GitHub authorization code');
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'ForgeTrack-App',
      },
    });

    if (!userRes.ok) {
      throw new UnauthorizedException('Failed to fetch GitHub user profile');
    }
    const userData = await userRes.json();

    // 3. Fetch primary verified email if public email is null
    let userEmail = userData.email;
    if (!userEmail) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'ForgeTrack-App',
          },
        });
        if (emailsRes.ok) {
          const emails = await emailsRes.json();
          const primary = emails.find((e: any) => e.primary && e.verified);
          if (primary) userEmail = primary.email;
          else if (emails.length > 0) userEmail = emails[0].email;
        }
      } catch (err) {
        this.logger.warn('Could not fetch user emails from GitHub:', err);
      }
    }

    if (!userEmail) {
      userEmail = `${userData.login}@users.noreply.github.com`;
    }

    return {
      provider: 'github',
      providerId: String(userData.id),
      email: userEmail.toLowerCase(),
      displayName: userData.name || userData.login || 'GitHub User',
      avatarUrl: userData.avatar_url,
      accessToken,
    };
  }

  getGoogleAuthUrl(state?: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }
    const redirectUri = encodeURIComponent(`${this.getRedirectBaseUrl()}/api/v1/auth/google/callback`);
    const scope = encodeURIComponent('openid email profile');
    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}${stateParam}`;
  }

  async exchangeGoogleCode(code: string): Promise<OAuthUserProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth credentials are not configured on the server.');
    }

    const redirectUri = `${this.getRedirectBaseUrl()}/api/v1/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      this.logger.error('Failed to obtain Google access token:', tokenData);
      throw new BadRequestException('Invalid Google authorization code');
    }

    const accessToken = tokenData.access_token;

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      throw new UnauthorizedException('Failed to fetch Google user profile');
    }
    const userData = await userRes.json();

    return {
      provider: 'google',
      providerId: userData.sub,
      email: userData.email.toLowerCase(),
      displayName: userData.name || userData.email.split('@')[0] || 'Google User',
      avatarUrl: userData.picture,
      accessToken,
    };
  }

  /**
   * Upsert user from OAuth profile and establish session
   */
  async upsertOAuthUser(
    profile: OAuthUserProfile,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: string; context: AuthContext }> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Look up existing user by provider + providerId OR by email
      const existingUsers = await manager.query(
        `SELECT id, email, display_name, avatar_url, status, oauth_provider, oauth_provider_id
         FROM users
         WHERE (oauth_provider = $1 AND oauth_provider_id = $2) OR email = $3
         LIMIT 1`,
        [profile.provider, profile.providerId, profile.email],
      );

      let user: any = null;

      if (existingUsers.length > 0) {
        user = existingUsers[0];
        // Update OAuth info, avatar, last login
        await manager.query(
          `UPDATE users
           SET oauth_provider = $1,
               oauth_provider_id = $2,
               avatar_url = COALESCE($3, avatar_url),
               display_name = COALESCE(display_name, $4),
               last_login_at = now(),
               updated_at = now()
           WHERE id = $5`,
          [profile.provider, profile.providerId, profile.avatarUrl || null, profile.displayName, user.id],
        );
      } else {
        // Create new user
        const insertRes = await manager.query(
          `INSERT INTO users (email, display_name, avatar_url, oauth_provider, oauth_provider_id, status, last_login_at)
           VALUES ($1, $2, $3, $4, $5, 'ACTIVE', now())
           RETURNING id, email, display_name, avatar_url, status, oauth_provider`,
          [profile.email, profile.displayName, profile.avatarUrl || null, profile.provider, profile.providerId],
        );
        user = insertRes[0];

        // Bootstrap default organization
        const orgName = `${profile.displayName}'s Workspace`;
        const orgSlug = this.slugify(profile.displayName);
        const orgRes = await manager.query(
          `INSERT INTO organizations (slug, name, description)
           VALUES ($1, $2, 'Default organization created on OAuth sign up')
           RETURNING id, slug, name`,
          [orgSlug, orgName],
        );
        const org = orgRes[0];

        // Link user as OWNER
        await manager.query(
          `INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
           VALUES ($1, $2, 'OWNER', 'ACTIVE', now())`,
          [org.id, user.id],
        );
      }

      // Check organization membership
      const memberRes = await manager.query(
        `SELECT om.organization_id, om.role, o.slug, o.name
         FROM organization_members om
         JOIN organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1 AND om.status = 'ACTIVE'
         ORDER BY om.joined_at DESC LIMIT 1`,
        [user.id],
      );
      let membership = memberRes[0];

      if (!membership) {
        // Bootstrap org if user existed without one
        const orgName = `${user.display_name || 'My'}'s Workspace`;
        const orgSlug = this.slugify(user.display_name || 'workspace');
        const orgRes = await manager.query(
          `INSERT INTO organizations (slug, name, description)
           VALUES ($1, $2, 'Workspace bootstrapped for user')
           RETURNING id, slug, name`,
          [orgSlug, orgName],
        );
        const org = orgRes[0];
        await manager.query(
          `INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
           VALUES ($1, $2, 'OWNER', 'ACTIVE', now())`,
          [org.id, user.id],
        );
        membership = {
          organization_id: org.id,
          slug: org.slug,
          name: org.name,
          role: 'OWNER',
        };
      }

      // Generate session token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

      await manager.query(
        `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, tokenHash, expiresAt, ipAddress || null, userAgent || null],
      );

      return {
        token: rawToken,
        context: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            avatarUrl: user.avatar_url || profile.avatarUrl,
            status: user.status,
            oauthProvider: profile.provider,
          },
          organization: {
            id: membership.organization_id,
            slug: membership.slug,
            name: membership.name,
            role: membership.role,
          },
        },
      };
    });
  }
}
