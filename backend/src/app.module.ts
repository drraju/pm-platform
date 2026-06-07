import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SanitizeResponseInterceptor } from './common/serialization/sanitize-response.interceptor';
import { createTypeOrmOptions } from './database/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GoogleDriveModule } from './modules/integrations/google-drive/google-drive.module';
import { SlackModule } from './modules/integrations/slack/slack.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RaidModule } from './modules/raid/raid.module';
import { RisksModule } from './modules/risks/risks.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(createTypeOrmOptions()),
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    RisksModule,
    RaidModule,
    DashboardModule,
    PortfolioModule,
    NotificationsModule,
    SlackModule,
    GoogleDriveModule,
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
