import { BaseEntity } from './base.entity';

export abstract class ProjectScopedEntity extends BaseEntity {
  projectId: string;
}
