import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsModule } from '../documents/documents.module';
import { ProjectsModule } from '../projects/projects.module';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { TaskExecutionUpdate } from '../tasks/entities/task-execution-update.entity';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectExportController } from './project-export.controller';
import { ProjectExportService } from './project-export.service';
import { ExcelExportProvider } from './excel/excel-export.provider';
import { ExcelWorksheetBuilder } from './excel/excel-worksheet-builder';
import { DependenciesWorksheetBuilder, DocumentsWorksheetBuilder, ExecutionHistoryWorksheetBuilder, KpisWorksheetBuilder, MilestonesWorksheetBuilder, RaidWorksheetBuilder, SummaryWorksheetBuilder, TasksWorksheetBuilder, TeamWorksheetBuilder } from './excel/excel-worksheet-builders';
import { EXCEL_WORKSHEET_BUILDERS } from './excel/excel.constants';

@Module({ imports: [ProjectsModule, TasksModule, DocumentsModule, TypeOrmModule.forFeature([TaskDependency, TaskExecutionUpdate])], controllers: [ProjectExportController], providers: [ProjectExportService, ExcelExportProvider, SummaryWorksheetBuilder, TasksWorksheetBuilder, MilestonesWorksheetBuilder, DependenciesWorksheetBuilder, RaidWorksheetBuilder, TeamWorksheetBuilder, DocumentsWorksheetBuilder, ExecutionHistoryWorksheetBuilder, KpisWorksheetBuilder, { provide: EXCEL_WORKSHEET_BUILDERS, useFactory: (...builders: ExcelWorksheetBuilder[]) => builders, inject: [SummaryWorksheetBuilder, TasksWorksheetBuilder, MilestonesWorksheetBuilder, DependenciesWorksheetBuilder, RaidWorksheetBuilder, TeamWorksheetBuilder, DocumentsWorksheetBuilder, ExecutionHistoryWorksheetBuilder, KpisWorksheetBuilder] }] })
export class ProjectExportModule {}

