import { toExternalIssueDto } from '../contracts/external-issue.dto';
import { toExternalProjectDto } from '../contracts/external-project.dto';
import { toExternalRiskDto } from '../contracts/external-risk.dto';
import { toExternalTaskDto } from '../contracts/external-task.dto';

const createdAt = new Date('2026-08-01T10:00:00.000Z');
const updatedAt = new Date('2026-08-02T10:00:00.000Z');

describe('external v1 response contracts', () => {
  it('projects expose only the approved analytical fields', () => {
    const dto = toExternalProjectDto({
      businessOwnerId: 'secret-governor',
      createdAt,
      description: 'internal description',
      health: { status: 'red' },
      id: 'project-1',
      members: [{ id: 'member-1' }],
      name: 'ERP Modernization',
      ownerId: 'secret-owner',
      startDate: '2026-08-01',
      status: 'active',
      targetEndDate: '2027-02-01',
      taskCounts: { total: 10 },
      updatedAt,
    } as never);

    expect(Object.keys(dto).sort()).toEqual(
      [
        'createdAt',
        'id',
        'name',
        'startDate',
        'status',
        'targetEndDate',
        'updatedAt',
      ].sort(),
    );
  });

  it('tasks expose only the approved analytical fields', () => {
    const dto = toExternalTaskDto({
      actualEndDate: null,
      actualStartDate: null,
      assignee: { email: 'hidden@example.com' },
      createdAt,
      description: 'hidden',
      dueDate: '2026-08-20',
      estimatedHours: 20,
      id: 'task-1',
      latestExecutionUpdate: { remarks: 'hidden' },
      milestoneCategory: null,
      parentTaskId: null,
      percentComplete: 40,
      plannedEndDate: '2026-08-20',
      plannedStartDate: '2026-08-10',
      priority: 'high',
      projectId: 'project-1',
      remainingHours: 12,
      remarks: 'hidden',
      sequenceNumber: 1,
      startDate: '2026-08-10',
      status: 'in_progress',
      taskKind: 'standard',
      title: 'Design',
      updatedAt,
    } as never);

    expect(Object.keys(dto).sort()).toEqual(
      [
        'actualEndDate',
        'actualStartDate',
        'createdAt',
        'dueDate',
        'estimatedHours',
        'id',
        'milestoneCategory',
        'parentTaskId',
        'percentComplete',
        'plannedEndDate',
        'plannedStartDate',
        'priority',
        'projectId',
        'remainingHours',
        'sequenceNumber',
        'startDate',
        'status',
        'taskKind',
        'title',
        'updatedAt',
      ].sort(),
    );
  });

  it('risks expose only the approved analytical fields', () => {
    const dto = toExternalRiskDto({
      comments: [{ body: 'hidden' }],
      createdAt,
      description: 'hidden',
      id: 'risk-1',
      impact: 'high',
      mitigationPlan: 'hidden',
      owner: { email: 'hidden@example.com' },
      probability: 'medium',
      projectId: 'project-1',
      status: 'open',
      title: 'Delivery risk',
      updatedAt,
    } as never);

    expect(Object.keys(dto).sort()).toEqual(
      [
        'createdAt',
        'id',
        'impact',
        'probability',
        'projectId',
        'status',
        'title',
        'updatedAt',
      ].sort(),
    );
  });

  it('issues expose only the approved analytical fields', () => {
    const dto = toExternalIssueDto({
      comments: [{ body: 'hidden' }],
      createdAt,
      description: 'hidden',
      id: 'issue-1',
      owner: { email: 'hidden@example.com' },
      projectId: 'project-1',
      resolutionPlan: 'hidden',
      severity: 'high',
      status: 'open',
      title: 'Delivery issue',
      updatedAt,
    } as never);

    expect(Object.keys(dto).sort()).toEqual(
      [
        'createdAt',
        'id',
        'projectId',
        'severity',
        'status',
        'title',
        'updatedAt',
      ].sort(),
    );
  });
});
