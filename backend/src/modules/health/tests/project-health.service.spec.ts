import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ProjectHealthStatus } from '../dto/project-health.dto';
import { ProjectHealthService } from '../project-health.service';

describe('ProjectHealthService', () => {
  let service: ProjectHealthService;

  beforeEach(() => {
    service = new ProjectHealthService();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns red when a critical issue is open', () => {
    expect(
      service.calculate({
        issues: [{ severity: 'critical', status: 'open' } as never],
      }),
    ).toEqual({
      status: ProjectHealthStatus.Red,
      reasons: ['1 critical issue open'],
    });
  });

  it('returns red when more than 20 percent of tasks are overdue', () => {
    expect(
      service.calculate({
        tasks: [
          task('2026-06-01'),
          task('2026-06-01'),
          task(),
          task(),
          task(),
        ],
      }),
    ).toEqual({
      status: ProjectHealthStatus.Red,
      reasons: ['40% tasks overdue (2/5)'],
    });
  });

  it('returns amber when a high risk is open', () => {
    expect(
      service.calculate({
        risks: [{ impact: 'high', status: 'open' } as never],
      }),
    ).toEqual({
      status: ProjectHealthStatus.Amber,
      reasons: ['1 high risk open'],
    });
  });

  it('returns green when no rule is breached', () => {
    expect(service.calculate({ tasks: [task()] })).toEqual({
      status: ProjectHealthStatus.Green,
      reasons: [
        'No critical issues, high risks, or overdue task threshold breaches',
      ],
    });
  });
});

function task(dueDate?: string) {
  return {
    dueDate,
    status: TaskStatus.Todo,
  } as never;
}
