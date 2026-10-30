import { planWorkEvents } from '../work-events';

describe('planWorkEvents', () => {
  it('gives the assignment to the new owner only', () => {
    expect(
      planWorkEvents({
        alreadyAlerted: false,
        isContainer: false,
        nextAssigneeId: 'ada',
        nextStatus: 'todo',
        overdue: false,
        previous: { assigneeId: 'previous', status: 'todo' },
      }),
    ).toEqual(['assigned']);
  });

  it('still records blocked when the owner made the change', () => {
    expect(
      planWorkEvents({
        alreadyAlerted: false,
        isContainer: false,
        nextAssigneeId: 'ada',
        nextStatus: 'blocked',
        overdue: false,
        previous: { assigneeId: 'ada', status: 'in_progress' },
      }),
    ).toEqual(['blocked']);
  });

  it('does not repeat an overdue episode', () => {
    const shared = {
      isContainer: false,
      nextAssigneeId: 'ada',
      nextStatus: 'todo',
      overdue: true,
      previous: { assigneeId: 'ada', status: 'todo' },
    };
    expect(planWorkEvents({ ...shared, alreadyAlerted: false })).toEqual(['overdue']);
    expect(planWorkEvents({ ...shared, alreadyAlerted: true })).toEqual([]);
  });
});
