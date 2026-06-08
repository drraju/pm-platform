import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { AddDependencyTimelineColumns1780848001000 } from './migrations/1780848001000-AddDependencyTimelineColumns';
import { AddProjectMemberVisibilityLevel1780848002000 } from './migrations/1780848002000-AddProjectMemberVisibilityLevel';
import { AddAdministrationMetadata1780848003000 } from './migrations/1780848003000-AddAdministrationMetadata';
import { AddUserUsernameForSuperAdmin1780848004000 } from './migrations/1780848004000-AddUserUsernameForSuperAdmin';
import { AddTaskTypeColumn1780848000000 } from './migrations/1780848000000-AddTaskTypeColumn';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { ProjectMember } from '../modules/projects/entities/project-member.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Assumption } from '../modules/raid/entities/assumption.entity';
import { Dependency } from '../modules/raid/entities/dependency.entity';
import { Issue } from '../modules/raid/entities/issue.entity';
import { Risk } from '../modules/raid/entities/risk.entity';
import { Task } from '../modules/tasks/entities/task.entity';
import { Permission } from '../modules/users/entities/permission.entity';
import { RolePermission } from '../modules/users/entities/role-permission.entity';
import { Role } from '../modules/users/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';

export const databaseEntities: Function[] = [
  User,
  Role,
  Permission,
  RolePermission,
  Project,
  ProjectMember,
  Task,
  Risk,
  Issue,
  Assumption,
  Dependency,
  Notification,
];

export const databaseMigrations: Function[] = [
  AddTaskTypeColumn1780848000000,
  AddDependencyTimelineColumns1780848001000,
  AddProjectMemberVisibilityLevel1780848002000,
  AddAdministrationMetadata1780848003000,
  AddUserUsernameForSuperAdmin1780848004000,
];

const databaseConnectionOptions = {
  type: 'postgres' as const,
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: process.env.POSTGRES_DB ?? 'pm_platform',
};

export const createTypeOrmOptions = (): TypeOrmModuleOptions => ({
  ...databaseConnectionOptions,
  entities: databaseEntities,
  migrations: databaseMigrations,
  autoLoadEntities: true,
  synchronize: false,
});

export const createDataSourceOptions = (): DataSourceOptions => ({
  ...databaseConnectionOptions,
  entities: databaseEntities,
  migrations: databaseMigrations,
  synchronize: false,
});

export const typeOrmConfig = createTypeOrmOptions();
