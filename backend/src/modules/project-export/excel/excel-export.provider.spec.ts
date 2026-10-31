import ExcelJS from 'exceljs';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
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

  it('exports the same project status the selected project shows', async () => {
    const yesterday = '2000-01-01';
    const buffer = await provider().export({
      project: {
        assumptions: [],
        dependencies: [],
        id: 'p1',
        issues: [],
        members: [],
        name: 'CapGemini',
        risks: [],
        status: 'active',
      } as never,
      tasks: [
        {
          dueDate: yesterday,
          id: 'group',
          projectId: 'p1',
          status: TaskStatus.InProgress,
          taskKind: TaskKind.Summary,
          title: 'Integration',
        },
        {
          dueDate: yesterday,
          id: 'late',
          parentTaskId: 'group',
          projectId: 'p1',
          status: TaskStatus.Blocked,
          taskKind: TaskKind.Standard,
          title: 'Test2',
        },
        {
          id: 'finished',
          parentTaskId: 'group',
          projectId: 'p1',
          status: TaskStatus.Done,
          taskKind: TaskKind.Standard,
          title: 'M05 check',
        },
      ] as never,
      taskDependencies: [],
      executionHistory: [],
      documents: [],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const summary = workbook.getWorksheet('Project Summary');
    const values = new Map<string, ExcelJS.CellValue>();
    summary?.eachRow((row) => {
      values.set(String(row.getCell(1).value), row.getCell(2).value);
    });
    expect(values.get('Status')).toBe('Active');
    expect(values.get('Health')).toBe('1 of 2 overdue');
    expect(values.get('Overdue')).toBe(1);
    expect(values.get('Blocked')).toBe(1);
    expect(values.get('Done')).toBe(1);
    expect(values.get('Completion %')).toBe(50);

    const tasks = workbook.getWorksheet('Project Tasks');
    const rows = tasks ? sheetRows(tasks) : [];
    expect(rows.find((row) => row[1] === 'Integration')?.[4]).toBe('');
    expect(rows.find((row) => row[1] === 'Integration')?.[6]).toBe('1/2');
    expect(rows.find((row) => row[1] === 'Test2')?.[4]).toBe('Blocked');
    expect(rows.find((row) => row[1] === 'Test2')?.[11]).toBe('Yes');
  });
});

function sheetRows(sheet: ExcelJS.Worksheet) {
  const rows: ExcelJS.CellValue[][] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((column) => row.getCell(column).value));
  });
  return rows;
}

