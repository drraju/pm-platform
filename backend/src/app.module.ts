import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthzModule } from './common/authz/authz.module';
import { SanitizeResponseInterceptor } from './common/serialization/sanitize-response.interceptor';
import { createTypeOrmOptions } from './database/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { HealthModule } from './modules/health/health.module';
import { SlackModule } from './modules/integrations/slack/slack.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlanningModule } from './modules/planning/planning.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RaidModule } from './modules/raid/raid.module';
import { ResourceModule } from './modules/resources/resource.module';
import { RisksModule } from './modules/risks/risks.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(createTypeOrmOptions()),
    AuthzModule,
    AuthModule,
    CalendarModule,
    ResourceModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    PlanningModule,
    RisksModule,
    RaidModule,
    DashboardModule,
    PortfolioModule,
    DocumentsModule,
    HealthModule,
    NotificationsModule,
    SlackModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeResponseInterceptor,
    },
  ],
})
export class AppModule {}
