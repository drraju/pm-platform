import { AiExecutionStateMachineService } from './ai-execution-state-machine.service';

describe('AiExecutionStateMachineService', () => {
  it('creates immutable traceable transitions', () => {
    const stateMachine = new AiExecutionStateMachineService();
    const created = stateMachine.create('exec-1', '2026-01-01T00:00:00.000Z');
    const validated = stateMachine.transition(
      created,
      'Validated',
      'Validated request metadata.',
      { requestId: 'req-1' },
      '2026-01-01T00:00:01.000Z',
    );

    expect(Object.isFrozen(created)).toBe(true);
    expect(Object.isFrozen(created.history)).toBe(true);
    expect(Object.isFrozen(validated.history[1])).toBe(true);
    expect(Object.isFrozen(validated.history[1]?.metadata)).toBe(true);
    expect(created.currentState).toBe('Created');
    expect(validated.currentState).toBe('Validated');
    expect(validated.history).toEqual([
      expect.objectContaining({
        sequence: 1,
        to: 'Created',
      }),
      expect.objectContaining({
        from: 'Created',
        metadata: { requestId: 'req-1' },
        sequence: 2,
        to: 'Validated',
      }),
    ]);
  });

  it('rejects invalid transitions', () => {
    const stateMachine = new AiExecutionStateMachineService();
    const created = stateMachine.create('exec-1');

    expect(() =>
      stateMachine.transition(created, 'Completed', 'Invalid jump.'),
    ).toThrow('Invalid AI execution transition: Created -> Completed');
  });
});
