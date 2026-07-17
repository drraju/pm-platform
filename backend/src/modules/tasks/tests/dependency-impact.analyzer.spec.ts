import {
  DependencyImpactLevel,
  DependencyTraversalEdge,
} from '../dependency-domain';
import { DependencyImpactAnalyzer } from '../dependency-impact.analyzer';

describe('DependencyImpactAnalyzer', () => {
  const analyzer = new DependencyImpactAnalyzer();
  const edge = (
    dependencyId: string,
    predecessorTaskId: string,
    successorTaskId: string,
  ): DependencyTraversalEdge => ({
    dependencyId,
    predecessorTaskId,
    successorTaskId,
  });

  it('calculates deterministic breadth-first direct and transitive impact', () => {
    const result = analyzer.analyze('a', [
      edge('d3', 'b', 'd'),
      edge('d2', 'a', 'c'),
      edge('d1', 'a', 'b'),
      edge('d4', 'c', 'e'),
    ]);

    expect(result).toMatchObject({
      directTaskCount: 2,
      impactedTaskCount: 4,
      level: DependencyImpactLevel.Medium,
      maxDepthReached: 2,
    });
    expect(result.traversal.impactedTaskIds).toEqual(['b', 'c', 'd', 'e']);
    expect(result.traversal.nodes).toEqual([
      { depth: 1, taskId: 'b' },
      { depth: 1, taskId: 'c' },
      { depth: 2, taskId: 'd' },
      { depth: 2, taskId: 'e' },
    ]);
  });

  it('terminates safely when corrupt input contains a cycle', () => {
    const result = analyzer.analyze('a', [
      edge('d1', 'a', 'b'),
      edge('d2', 'b', 'c'),
      edge('d3', 'c', 'a'),
    ]);

    expect(result.traversal.impactedTaskIds).toEqual(['b', 'c']);
    expect(result.traversal.truncated).toBe(false);
  });

  it('reports depth truncation', () => {
    const result = analyzer.analyze(
      'a',
      [edge('d1', 'a', 'b'), edge('d2', 'b', 'c')],
      { maxDepth: 1, maxTasks: 10 },
    );

    expect(result.traversal.impactedTaskIds).toEqual(['b']);
    expect(result.traversal.truncated).toBe(true);
  });

  it('reports task-count truncation with stable selection', () => {
    const result = analyzer.analyze(
      'a',
      [edge('d3', 'a', 'd'), edge('d1', 'a', 'b'), edge('d2', 'a', 'c')],
      { maxDepth: 10, maxTasks: 2 },
    );

    expect(result.traversal.impactedTaskIds).toEqual(['b', 'c']);
    expect(result.traversal.truncated).toBe(true);
  });

  it('returns no impact for a terminal task', () => {
    expect(analyzer.analyze('a', [])).toMatchObject({
      directTaskCount: 0,
      impactedTaskCount: 0,
      level: DependencyImpactLevel.None,
      maxDepthReached: 0,
    });
  });

  it.each([
    [{ maxDepth: 0, maxTasks: 1 }, 'maxDepth'],
    [{ maxDepth: 1, maxTasks: 0 }, 'maxTasks'],
    [{ maxDepth: 1.5, maxTasks: 1 }, 'maxDepth'],
  ])('rejects invalid traversal policy %o', (policy, field) => {
    expect(() => analyzer.analyze('a', [], policy)).toThrow(field);
  });
});
