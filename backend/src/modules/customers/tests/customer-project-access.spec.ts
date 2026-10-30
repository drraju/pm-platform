import { projectIsOpenable } from '../customers.service';

describe('customer project access', () => {
  it('lets sales see a project name without opening the plan', () => {
    expect(projectIsOpenable([], 'project-1')).toBe(false);
    expect(projectIsOpenable(['project-1'], 'project-1')).toBe(true);
    expect(projectIsOpenable('all', 'project-1')).toBe(true);
  });
});
