import { OutlineRole } from '../enums/outline-role.enum';
import { TaskKind } from '../enums/task-kind.enum';
import {
  outlinePlacementError,
  outlineRoleFromTaskKind,
  resolveOutlineRole,
  taskKindForOutlineRole,
} from './outline-role';

describe('outline role', () => {
  it('maps a phase, milestone, and summary onto summary scheduling', () => {
    expect(taskKindForOutlineRole(OutlineRole.Phase)).toBe(TaskKind.Summary);
    expect(taskKindForOutlineRole(OutlineRole.Milestone)).toBe(TaskKind.Summary);
    expect(taskKindForOutlineRole(OutlineRole.Summary)).toBe(TaskKind.Summary);
    expect(taskKindForOutlineRole(OutlineRole.Work)).toBe(TaskKind.Standard);
    expect(taskKindForOutlineRole(OutlineRole.Gate)).toBe(TaskKind.Milestone);
  });

  it('keeps an existing milestone as a gate when no outline role is stored', () => {
    expect(outlineRoleFromTaskKind(TaskKind.Milestone)).toBe(OutlineRole.Gate);
    expect(resolveOutlineRole({ taskKind: TaskKind.Summary })).toBe(OutlineRole.Summary);
    expect(resolveOutlineRole({ outlineRole: OutlineRole.Phase, taskKind: TaskKind.Summary })).toBe(
      OutlineRole.Phase,
    );
  });

  it('allows the CapGemini tree and rejects an illegal parent', () => {
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Phase,
        parentParentRole: null,
        parentRole: null,
      }),
    ).toBeNull();
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Milestone,
        parentParentRole: null,
        parentRole: OutlineRole.Phase,
      }),
    ).toBeNull();
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Summary,
        parentParentRole: null,
        parentRole: OutlineRole.Milestone,
      }),
    ).toBeNull();
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Work,
        parentParentRole: null,
        parentRole: OutlineRole.Summary,
      }),
    ).toBeNull();
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Work,
        parentParentRole: OutlineRole.Summary,
        parentRole: OutlineRole.Work,
      }),
    ).toBeNull();
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Work,
        parentParentRole: null,
        parentRole: OutlineRole.Phase,
      }),
    ).toBe('A phase holds milestones, summaries, and gates.');
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Work,
        parentParentRole: null,
        parentRole: OutlineRole.Gate,
      }),
    ).toBe('A gate cannot contain other rows.');
    expect(
      outlinePlacementError({
        childHasChildren: false,
        childRole: OutlineRole.Work,
        parentParentRole: OutlineRole.Work,
        parentRole: OutlineRole.Work,
      }),
    ).toBe('A subtask cannot contain other rows.');
    expect(
      outlinePlacementError({
        childHasChildren: true,
        childRole: OutlineRole.Work,
        parentParentRole: OutlineRole.Summary,
        parentRole: OutlineRole.Work,
      }),
    ).toBe('Tasks with child tasks cannot become subtasks or milestones');
  });
});
