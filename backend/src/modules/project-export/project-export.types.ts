import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { TaskExecutionUpdate } from '../tasks/entities/task-execution-update.entity';
import { ProjectDocumentResponse } from '../documents/documents.service';

export type ProjectExportData = {
  project: Project;
  tasks: Task[];
  taskDependencies: TaskDependency[];
  executionHistory: TaskExecutionUpdate[];
  documents: ProjectDocumentResponse[];
};

export interface ProjectExportProvider {
  export(data: ProjectExportData): Promise<Buffer>;
}

