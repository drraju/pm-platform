import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { Task } from '../tasks/entities/task.entity';
import { ExternalCursorCodec } from './contracts/external-cursor';
import {
  ExternalIssueDto,
  toExternalIssueDto,
} from './contracts/external-issue.dto';
import {
  ExternalPageDto,
  ExternalPageRequestDto,
  ExternalPaginationPolicy,
} from './contracts/external-page.dto';
import {
  ExternalProjectDto,
  toExternalProjectDto,
} from './contracts/external-project.dto';
import {
  ExternalRiskDto,
  toExternalRiskDto,
} from './contracts/external-risk.dto';
import {
  ExternalTaskDto,
  toExternalTaskDto,
} from './contracts/external-task.dto';
import {
  ExternalDataScope,
  ResolvedExternalDataScope,
} from './scope/external-data-scope';

type ExternalPageEntity = {
  id: string;
  updatedAt: Date;
};

@Injectable()
export class ExternalReadQueryService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    @InjectRepository(Issue)
    private readonly issuesRepository: Repository<Issue>,
    private readonly paginationPolicy: ExternalPaginationPolicy,
    private readonly cursorCodec: ExternalCursorCodec,
  ) {}

  findProjects(
    scope: ResolvedExternalDataScope,
    request: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalProjectDto>> {
    return this.findPage<Project, ExternalProjectDto>(
      this.projectsRepository,
      'project',
      [
        'project.id',
        'project.name',
        'project.status',
        'project.startDate',
        'project.targetEndDate',
        'project.createdAt',
        'project.updatedAt',
      ],
      scope,
      request,
      toExternalProjectDto,
    );
  }

  findTasks(
    scope: ResolvedExternalDataScope,
    request: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalTaskDto>> {
    return this.findPage<Task, ExternalTaskDto>(
      this.tasksRepository,
      'task',
      [
        'task.id',
        'task.projectId',
        'task.parentTaskId',
        'task.title',
        'task.taskKind',
        'task.milestoneCategory',
        'task.status',
        'task.priority',
        'task.percentComplete',
        'task.sequenceNumber',
        'task.startDate',
        'task.dueDate',
        'task.plannedStartDate',
        'task.plannedEndDate',
        'task.actualStartDate',
        'task.actualEndDate',
        'task.estimatedHours',
        'task.remainingHours',
        'task.createdAt',
        'task.updatedAt',
      ],
      scope,
      request,
      toExternalTaskDto,
    );
  }

  findRisks(
    scope: ResolvedExternalDataScope,
    request: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalRiskDto>> {
    return this.findPage<Risk, ExternalRiskDto>(
      this.risksRepository,
      'risk',
      [
        'risk.id',
        'risk.projectId',
        'risk.title',
        'risk.status',
        'risk.probability',
        'risk.impact',
        'risk.createdAt',
        'risk.updatedAt',
      ],
      scope,
      request,
      toExternalRiskDto,
    );
  }

  findIssues(
    scope: ResolvedExternalDataScope,
    request: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalIssueDto>> {
    return this.findPage<Issue, ExternalIssueDto>(
      this.issuesRepository,
      'issue',
      [
        'issue.id',
        'issue.projectId',
        'issue.title',
        'issue.status',
        'issue.severity',
        'issue.createdAt',
        'issue.updatedAt',
      ],
      scope,
      request,
      toExternalIssueDto,
    );
  }

  private async findPage<Entity extends ExternalPageEntity, Dto>(
    repository: Repository<Entity>,
    alias: string,
    selection: string[],
    scope: ResolvedExternalDataScope,
    request: ExternalPageRequestDto,
    toDto: (entity: Entity) => Dto,
  ): Promise<ExternalPageDto<Dto>> {
    if (scope.kind !== ExternalDataScope.AllProjects) {
      throw new ForbiddenException('External API access denied');
    }

    const page = this.paginationPolicy.validate(request);
    const snapshotAt = page.snapshotAt ?? new Date().toISOString();
    const query = repository
      .createQueryBuilder(alias)
      .select(selection)
      .where(`${alias}.updated_at <= :snapshotAt`, { snapshotAt });

    if (page.updatedSince) {
      query.andWhere(`${alias}.updated_at >= :updatedSince`, {
        updatedSince: page.updatedSince,
      });
    }
    if (page.cursor) {
      query.andWhere(
        new Brackets((cursorQuery) => {
          cursorQuery
            .where(`${alias}.updated_at > :cursorUpdatedAt`, {
              cursorUpdatedAt: page.cursor!.updatedAt,
            })
            .orWhere(
              `(${alias}.updated_at = :cursorUpdatedAt AND ${alias}.id > :cursorId)`,
              {
                cursorId: page.cursor!.id,
                cursorUpdatedAt: page.cursor!.updatedAt,
              },
            );
        }),
      );
    }

    const entities = await query
      .orderBy(`${alias}.updated_at`, 'ASC')
      .addOrderBy(`${alias}.id`, 'ASC')
      .take(page.limit + 1)
      .getMany();
    const hasMore = entities.length > page.limit;
    const pageEntities = hasMore ? entities.slice(0, page.limit) : entities;
    const lastEntity = pageEntities.at(-1);

    return {
      data: pageEntities.map(toDto),
      nextCursor:
        hasMore && lastEntity
          ? this.cursorCodec.encode({
              id: lastEntity.id,
              updatedAt: lastEntity.updatedAt.toISOString(),
            })
          : null,
      snapshotAt,
    };
  }
}
