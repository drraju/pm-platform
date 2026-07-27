import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { EnterpriseCalendarException } from '../modules/calendars/entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from '../modules/calendars/entities/enterprise-calendar.entity';
import {
  DocumentCategory,
  DocumentType,
  ProjectDocument,
} from '../modules/documents/entities';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { PlanningScheduleSnapshot } from '../modules/planning/entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from '../modules/planning/entities/planning-task-schedule.entity';
import { PortfolioDependency } from '../modules/planning/entities/portfolio-dependency.entity';
import { ResourceAllocation } from '../modules/planning/entities/resource-allocation.entity';
import { ResourceCapacity } from '../modules/planning/entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from '../modules/planning/entities/resource-workload-snapshot.entity';
import { ProjectBaselineTask } from '../modules/projects/entities/project-baseline-task.entity';
import { ProjectBaseline } from '../modules/projects/entities/project-baseline.entity';
import { ProjectMember } from '../modules/projects/entities/project-member.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Assumption } from '../modules/raid/entities/assumption.entity';
import { Dependency } from '../modules/raid/entities/dependency.entity';
import { Issue } from '../modules/raid/entities/issue.entity';
import { RaidComment } from '../modules/raid/entities/raid-comment.entity';
import { RaidHistoryEntry } from '../modules/raid/entities/raid-history-entry.entity';
import { Risk } from '../modules/raid/entities/risk.entity';
import { ResourceAssignment } from '../modules/resources/entities/resource-assignment.entity';
import { ResourceAvailabilityOverride } from '../modules/resources/entities/resource-availability-override.entity';
import { ResourceCapacityPolicy } from '../modules/resources/entities/resource-capacity-policy.entity';
import { ResourceSkill } from '../modules/resources/entities/resource-skill.entity';
import { Resource } from '../modules/resources/entities/resource.entity';
import { Skill } from '../modules/resources/entities/skill.entity';
import { TaskDependency } from '../modules/tasks/entities/task-dependency.entity';
import { TaskExecutionUpdate } from '../modules/tasks/entities/task-execution-update.entity';
import { Task } from '../modules/tasks/entities/task.entity';
import { Permission } from '../modules/users/entities/permission.entity';
import { RolePermission } from '../modules/users/entities/role-permission.entity';
import { Role } from '../modules/users/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';

type EntityConstructor = abstract new (...args: never[]) => unknown;

export const databaseEntities: EntityConstructor[] = [
  User,
  Role,
  Permission,
  RolePermission,
  EnterpriseCalendar,
  EnterpriseCalendarException,
  Resource,
  Skill,
  ResourceSkill,
  ResourceAssignment,
  ResourceCapacityPolicy,
  ResourceAvailabilityOverride,
  Project,
  ProjectBaseline,
  ProjectBaselineTask,
  ProjectMember,
  Task,
  TaskDependency,
  TaskExecutionUpdate,
  PlanningTaskSchedule,
  PortfolioDependency,
  ResourceAllocation,
  ResourceCapacity,
  PlanningScheduleSnapshot,
  ResourceWorkloadSnapshot,
  DocumentCategory,
  DocumentType,
  ProjectDocument,
  Risk,
  Issue,
  Assumption,
  Dependency,
  RaidComment,
  RaidHistoryEntry,
  Notification,
  PasswordResetToken,
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
  autoLoadEntities: true,
  synchronize: false,
});

export const createDataSourceOptions = (): DataSourceOptions => ({
  ...databaseConnectionOptions,
  entities: databaseEntities,
  synchronize: false,
});

export const typeOrmConfig = createTypeOrmOptions();
