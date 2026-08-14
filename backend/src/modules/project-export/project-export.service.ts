import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DocumentsService } from '../documents/documents.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { TaskExecutionUpdate } from '../tasks/entities/task-execution-update.entity';
import { ExcelExportProvider } from './excel/excel-export.provider';
import { ProjectExportProvider } from './project-export.types';
import { AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';

@Injectable()
export class ProjectExportService {
  private readonly providers = new Map<string, ProjectExportProvider>();
  constructor(private readonly projects: ProjectsService, private readonly documents: DocumentsService, @InjectRepository(TaskDependency) private readonly dependencies: Repository<TaskDependency>, @InjectRepository(TaskExecutionUpdate) private readonly executionUpdates: Repository<TaskExecutionUpdate>, private readonly excel: ExcelExportProvider, private readonly authorizationPolicyService: AuthorizationPolicyService) { this.providers.set('excel', excel); }

  async exportProject(projectId: string, actor: { userId: string; roleId: string }, format = 'excel') {
    const provider = this.providers.get(format);
    if (!provider) throw new Error(`Unsupported export format: ${format}`);
    const project = await this.projects.findOne(projectId, actor);
    const tasks = await this.projects.findProjectTasks(projectId, {}, actor);
    const taskIds = tasks.map((task) => task.id);
    const isExternal = await this.authorizationPolicyService.isExternalActor(actor);
    const [taskDependencies, executionHistory, documents] = await Promise.all([
      !isExternal && taskIds.length ? this.dependencies.find({ where: [{ predecessorTaskId: In(taskIds) }, { successorTaskId: In(taskIds) }] }) : Promise.resolve([]),
      isExternal ? Promise.resolve([]) : this.executionUpdates.find({ where: { projectId }, order: { createdAt: 'ASC' } }),
      this.documents.findProjectDocuments(projectId, {}, actor),
    ]);
    return provider.export({ project, tasks, taskDependencies, executionHistory, documents });
  }
}
