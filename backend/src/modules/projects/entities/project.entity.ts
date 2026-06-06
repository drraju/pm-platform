import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ProjectHealthDto } from '../../health/dto/project-health.dto';
import { Dependency } from '../../raid/entities/dependency.entity';
import { Issue } from '../../raid/entities/issue.entity';
import { Risk } from '../../raid/entities/risk.entity';
import { Assumption } from '../../raid/entities/assumption.entity';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from './project-member.entity';

@Entity({ name: 'projects' })
export class Project extends AuditableEntity {
  @ApiProperty({ example: 'ERP Modernization' })
  @Column()
  name: string;

  @ApiPropertyOptional({ example: 'Modernize finance and operations systems.' })
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ApiProperty({ example: 'active', default: 'active' })
  @Column({ default: 'active' })
  status: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-01-15' })
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @ApiPropertyOptional({ format: 'date', example: '2026-09-30' })
  @Column({ name: 'target_end_date', type: 'date', nullable: true })
  targetEndDate?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @OneToMany(() => Risk, (risk) => risk.project)
  risks: Risk[];

  @OneToMany(() => Issue, (issue) => issue.project)
  issues: Issue[];

  @OneToMany(() => Assumption, (assumption) => assumption.project)
  assumptions: Assumption[];

  @OneToMany(() => Dependency, (dependency) => dependency.project)
  dependencies: Dependency[];

  @ApiPropertyOptional({ type: ProjectHealthDto })
  health?: ProjectHealthDto;
}
