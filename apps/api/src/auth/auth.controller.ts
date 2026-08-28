import { Controller, Post, Body, Get, Delete, Param, Query, Res, Req, Ip, Headers, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService, AuthContext } from './auth.service';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser, CurrentOrg, Public } from './decorators/auth.decorator';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<ApiSuccessEnvelope<AuthContext>> {
    const data = await this.authService.register(dto);
    return { data };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccessEnvelope<AuthContext>> {
    const { token, context } = await this.authService.login(dto, ipAddress, userAgent);
    
    // Set secure cookie
    response.cookie('sid', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return { data: context };
  }

  /**
   * GitHub OAuth Initiation
   */
  @Public()
  @Get('github')
  githubAuth(@Query('state') state: string, @Res() res: Response): void {
    const url = this.oauthService.getGitHubAuthUrl(state);
    res.redirect(url);
  }

  /**
   * GitHub OAuth Callback
   */
  @Public()
  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    const profile = await this.oauthService.exchangeGitHubCode(code);
    const { token } = await this.oauthService.upsertOAuthUser(profile, ipAddress, userAgent);

    // Set secure cookie
    res.cookie('sid', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    let redirectTarget = '';
    if (state && state.startsWith('http')) {
      try {
        const parsed = new URL(state);
        parsed.searchParams.set('sid', token);
        redirectTarget = parsed.toString();
      } catch {
        const origin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        redirectTarget = `${origin}/auth/callback?sid=${token}`;
      }
    } else {
      const origin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      redirectTarget = `${origin}/auth/callback?sid=${token}`;
    }
    res.redirect(redirectTarget);
  }

  /**
   * Google OAuth Initiation
   */
  @Public()
  @Get('google')
  googleAuth(@Query('state') state: string, @Res() res: Response): void {
    const url = this.oauthService.getGoogleAuthUrl(state);
    res.redirect(url);
  }

  /**
   * Google OAuth Callback
   */
  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }

    const profile = await this.oauthService.exchangeGoogleCode(code);
    const { token } = await this.oauthService.upsertOAuthUser(profile, ipAddress, userAgent);

    res.cookie('sid', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    let redirectTarget = '';
    if (state && state.startsWith('http')) {
      try {
        const parsed = new URL(state);
        parsed.searchParams.set('sid', token);
        redirectTarget = parsed.toString();
      } catch {
        const origin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        redirectTarget = `${origin}/auth/callback?sid=${token}`;
      }
    } else {
      const origin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      redirectTarget = `${origin}/auth/callback?sid=${token}`;
    }
    res.redirect(redirectTarget);
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    const token = request.cookies?.sid || request.headers.authorization?.substring(7);
    if (token) {
      await this.authService.logout(token);
    }
    
    response.clearCookie('sid');
    return { data: { success: true } };
  }

  @Get('me')
  getMe(
    @CurrentUser() user: any,
    @CurrentOrg() organization: any,
  ): ApiSuccessEnvelope<AuthContext> {
    return {
      data: {
        user,
        organization,
      },
    };
  }

  @Post('api-tokens')
  async createApiToken(
    @CurrentUser() user: any,
    @CurrentOrg() organization: any,
    @Body('name') name: string,
    @Body('scopes') scopes: string[],
  ): Promise<ApiSuccessEnvelope<{ token: string }>> {
    if (!name || !organization) {
      throw new BadRequestException('Token name and active organization are required.');
    }
    const token = await this.authService.createApiToken(user.id, organization.id, name, scopes || []);
    return { data: { token } };
  }

  @Get('api-tokens')
  async listApiTokens(
    @CurrentOrg() organization: any,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    if (!organization) {
      throw new BadRequestException('An active organization context is required.');
    }
    const data = await this.authService.listApiTokens(organization.id);
    return { data };
  }

  @Delete('api-tokens/:id')
  async revokeApiToken(
    @CurrentOrg() organization: any,
    @Param('id') tokenId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    if (!organization) {
      throw new BadRequestException('An active organization context is required.');
    }
    await this.authService.revokeApiToken(tokenId, organization.id);
    return { data: { success: true } };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    if (!email) throw new BadRequestException('Email is required');
    await this.authService.requestPasswordReset(email);
    return { data: { success: true } };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') newPassword: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    if (!token || !newPassword) throw new BadRequestException('Token and password are required');
    await this.authService.resetPassword(token, newPassword);
    return { data: { success: true } };
  }

  @Post('verify-email/request')
  async requestVerification(
    @CurrentUser() user: any,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.authService.requestVerification(user.id);
    return { data: { success: true } };
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(
    @Body('token') token: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    if (!token) throw new BadRequestException('Verification token is required');
    await this.authService.verifyEmail(token);
    return { data: { success: true } };
  }
}
