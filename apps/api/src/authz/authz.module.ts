import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthzService } from './authz.service';
import { PermissionsGuard } from './guards/permissions.guard';

@Global()
@Module({
  providers: [
    AuthzService,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthzService],
})
export class AuthzModule {}
