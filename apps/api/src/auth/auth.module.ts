import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, OAuthService],
})
export class AuthModule {}
