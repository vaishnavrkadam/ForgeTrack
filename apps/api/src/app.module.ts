import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { OrgModule } from './org/org.module';
import { AuthzModule } from './authz/authz.module';
import { ProjectModule } from './project/project.module';
import { IssueModule } from './issue/issue.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { IntegrationModule } from './integration/integration.module';
import { ReleaseCiModule } from './release-ci/release-ci.module';
import { WebhookModule } from './webhook/webhook.module';
import { NotificationModule } from './notification/notification.module';
import { AiModule } from './ai/ai.module';
import { CommonModule } from './common/common.module';
import { CommentModule } from './comment/comment.module';
import { AttachmentModule } from './attachment/attachment.module';
import { AutomationModule } from './automation/automation.module';
import { AuditModule } from './audit/audit.module';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

import { createDatabaseDataSource } from './database/database-connection.factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('database')!,
      dataSourceFactory: async (options) => createDatabaseDataSource(options),
    }),
    DatabaseModule,
    AuthModule,
    OrgModule,
    AuthzModule,
    ProjectModule,
    IssueModule,
    DashboardModule,
    IntegrationModule,
    ReleaseCiModule,
    WebhookModule,
    NotificationModule,
    AiModule,
    CommonModule,
    CommentModule,
    AttachmentModule,
    AutomationModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
