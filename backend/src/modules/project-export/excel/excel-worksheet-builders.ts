import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { ExcelWorksheetBuilder, displayUser, formatDate } from './excel-worksheet-builder';
import { ProjectExportData } from '../project-export.types';
import { Worksheet } from 'exceljs';

export class SummaryWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'Project Summary';
  build(sheet: Worksheet, { project, tasks, documents }: ProjectExportData) {
    const overdue = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.Done).length;
    const blocked = tasks.filter((task) => task.status === TaskStatus.Blocked).length;
    const completion = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + (task.percentComplete ?? 0), 0) / tasks.length) : 0;
    const openRaid = [...(project.risks ?? []), ...(project.issues ?? []), ...(project.assumptions ?? []), ...(project.dependencies ?? [])].filter((item) => item.status !== 'closed' && item.status !== 'resolved').length;
    const rows = [
      ['Project Name', project.name], ['Description', project.description ?? ''], ['Status', project.status], ['Health', project.health?.status ?? ''], ['Owner', displayUser(project.owner)],
      ['Start Date', formatDate(project.startDate)], ['Target End Date', formatDate(project.targetEndDate)], ['Completion %', completion], ['Total Tasks', tasks.length],
      ['Completed Tasks', tasks.filter((task) => task.status === TaskStatus.Done).length], ['Overdue Tasks', overdue], ['Blocked Tasks', blocked], ['Open RAID Items', openRaid],
      ['Document Count', documents.length], ['Last Updated', formatDate(project.updatedAt)],
    ];
    sheet.addRows(rows);
    sheet.getColumn(1).width = 24; sheet.getColumn(2).width = 48;
    sheet.getColumn(1).font = { bold: true, color: { argb: 'FF1F4E78' } };
    [6, 7, 15].forEach((rowNumber) => {
      sheet.getCell(rowNumber, 2).numFmt = 'dd-mmm-yyyy';
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }
}

export class TasksWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'Project Tasks';
  build(sheet: Worksheet, { tasks }: ProjectExportData) {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    this.table(sheet, ['Task ID', 'Task Name', 'Hierarchy', 'Owner', 'Status', 'Priority', 'Progress %', 'Start Date', 'Due Date', 'Actual Completion', 'Blocked', 'Next Action Owner', 'Last Execution Update'], tasks.map((task) => {
      const update = task.latestExecutionUpdate;
      return [task.id, task.title, hierarchy(task, byId), displayUser(task.assignee), task.status, task.priority, task.percentComplete ?? 0, formatDate(task.startDate), formatDate(task.dueDate), formatDate(task.actualEndDate), task.status === TaskStatus.Blocked ? 'Yes' : 'No', update?.nextActionOwnerId ?? '', update?.updateNotes ?? ''];
    }));
  }
}

export class MilestonesWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'Milestones';
  build(sheet: Worksheet, { tasks }: ProjectExportData) {
    this.table(sheet, ['Milestone', 'Status', 'Due Date', 'Completion'], tasks.filter((task) => task.taskKind === TaskKind.Milestone).map((task) => [task.title, task.status, formatDate(task.dueDate), task.percentComplete ?? 0]));
  }
}

export class DependenciesWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'Dependencies';
  build(sheet: Worksheet, { taskDependencies, tasks }: ProjectExportData) {
    const byId = new Map(tasks.map((task) => [task.id, task.title]));
    this.table(sheet, ['Predecessor', 'Successor', 'Dependency Type', 'Status'], taskDependencies.map((item) => [byId.get(item.predecessorTaskId) ?? item.predecessorTaskId, byId.get(item.successorTaskId) ?? item.successorTaskId, item.dependencyType, 'Active']));
  }
}

export class RaidWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'RAID Register';
  build(sheet: Worksheet, { project }: ProjectExportData) {
    const items = [...(project.risks ?? []), ...(project.issues ?? []), ...(project.assumptions ?? []), ...(project.dependencies ?? [])];
    this.table(sheet, ['Type', 'Title', 'Priority', 'Owner', 'Status', 'Due Date'], items.map((item) => [item.type, item.title, 'impact' in item ? item.impact : '', displayUser(item.owner), item.status, 'dueDate' in item ? formatDate(item.dueDate) : null]));
  }
}

export class TeamWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'Team Members';
  build(sheet: Worksheet, { project }: ProjectExportData) {
    this.table(sheet, ['Member', 'Role', 'Allocation'], (project.members ?? []).map((member) => [displayUser(member.user), member.role, '']));
  }
}

export class DocumentsWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'Documents';
  build(sheet: Worksheet, { documents }: ProjectExportData) {
    this.table(sheet, ['Title', 'Type', 'Owner', 'Last Modified'], documents.map((document) => [document.title, document.documentType, displayUser(document.owner), formatDate(document.updatedAt)]));
  }
}

export class ExecutionHistoryWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'Execution History';
  build(sheet: Worksheet, { executionHistory, tasks }: ProjectExportData) {
    const byId = new Map(tasks.map((task) => [task.id, task.title]));
    this.table(sheet, ['Task', 'Date', 'Updated By', 'Previous Status', 'New Status', 'Progress', 'Comments'], executionHistory.map((update) => [byId.get(update.taskId) ?? update.taskId, formatDate(update.createdAt), update.updatedById ?? '', update.changes?.status?.previousValue ?? '', update.status, update.percentComplete, update.updateNotes ?? '']));
  }
}

export class KpisWorksheetBuilder extends ExcelWorksheetBuilder {
  readonly name = 'KPIs';
  build(sheet: Worksheet, { project, tasks, documents }: ProjectExportData) {
    const raid = [...(project.risks ?? []), ...(project.issues ?? []), ...(project.assumptions ?? []), ...(project.dependencies ?? [])];
    this.table(sheet, ['Metric', 'Value'], [['Tasks', tasks.length], ['Completed', tasks.filter((task) => task.status === TaskStatus.Done).length], ['Overdue', tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.Done).length], ['Blocked', tasks.filter((task) => task.status === TaskStatus.Blocked).length], ['Milestones', tasks.filter((task) => task.taskKind === TaskKind.Milestone).length], ['RAID', raid.length], ['Documents', documents.length]]);
  }
}

function hierarchy(task: { parentTaskId?: string | null }, byId: Map<string, { title: string; parentTaskId?: string | null }>) {
  const names: string[] = []; let current = task;
  while (current.parentTaskId) { const parent = byId.get(current.parentTaskId); if (!parent) break; names.unshift(parent.title); current = parent; }
  return names.join(' > ');
}
