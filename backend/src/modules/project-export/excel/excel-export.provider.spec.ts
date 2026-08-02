import ExcelJS from 'exceljs';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { ExcelExportProvider } from './excel-export.provider';
import { DependenciesWorksheetBuilder, DocumentsWorksheetBuilder, ExecutionHistoryWorksheetBuilder, KpisWorksheetBuilder, MilestonesWorksheetBuilder, RaidWorksheetBuilder, SummaryWorksheetBuilder, TasksWorksheetBuilder, TeamWorksheetBuilder } from './excel-worksheet-builders';

describe('ExcelExportProvider', () => {
  function provider() {
    return new ExcelExportProvider([
      new SummaryWorksheetBuilder(), new TasksWorksheetBuilder(), new MilestonesWorksheetBuilder(), new DependenciesWorksheetBuilder(), new RaidWorksheetBuilder(), new TeamWorksheetBuilder(), new DocumentsWorksheetBuilder(), new ExecutionHistoryWorksheetBuilder(), new KpisWorksheetBuilder(),
    ]);
  }

  it('generates a formatted summary, task, and KPI workbook', async () => {
    const workbookBuffer = await provider().export({
      project: { id: 'p1', name: 'Apollo', status: 'active', owner: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }, members: [], risks: [], issues: [], assumptions: [], dependencies: [] } as never,
      tasks: [{ id: 't1', title: 'Build', projectId: 'p1', status: 'done', priority: 'high', percentComplete: 100, taskKind: TaskKind.Standard } as never],
      taskDependencies: [], executionHistory: [], documents: [],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Project Summary', 'Project Tasks', 'KPIs']);
    expect(workbook.getWorksheet('Project Tasks')?.getRow(1).values).toContain('Task Name');
    expect(workbook.getWorksheet('Project Tasks')?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(workbook.getWorksheet('Project Tasks')?.autoFilter).toBeTruthy();
  });

  it('omits data sheets when the project has no rows', async () => {
    const buffer = await provider().export({ project: { id: 'p1', name: 'Empty', status: 'active', members: [], risks: [], issues: [], assumptions: [], dependencies: [] } as never, tasks: [], taskDependencies: [], executionHistory: [], documents: [] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Project Summary', 'KPIs']);
  });
});

