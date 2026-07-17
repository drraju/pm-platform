import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TaskKind } from '../../../common/enums/task-kind.enum';

describe('enterprise milestone architecture', () => {
  const sourceRoot = join(process.cwd(), 'src');

  it('keeps TaskKind.Milestone canonical without a milestone aggregate or table', () => {
    expect(TaskKind.Milestone).toBe('milestone');
    const files = walk(sourceRoot);
    expect(
      files.some((file) =>
        /milestone\.(entity|repository|module)\.ts$/.test(file),
      ),
    ).toBe(false);

    const sql = files
      .filter((file) => file.endsWith('.sql'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(sql).not.toMatch(
      /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+milestones?\b/i,
    );
  });

  it('keeps Planning as scheduling authority and delegates milestone persistence', () => {
    const planning = readFileSync(
      join(sourceRoot, 'modules/planning/planning.service.ts'),
      'utf8',
    );
    const tasks = readFileSync(
      join(sourceRoot, 'modules/tasks/tasks.service.ts'),
      'utf8',
    );
    expect(planning).toContain('PlanningScheduleEngineService');
    expect(planning).toContain('canonicalTasksService');
    expect(tasks).toContain('completeMilestone');
    expect(tasks).toContain('reopenMilestone');
    expect(tasks).toContain('cancelMilestone');
    expect(
      existsSync(join(sourceRoot, 'common/scheduling/scheduling-context.ts')),
    ).toBe(true);
  });
});

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
