import { sanitizeResponse } from './sanitize-response';

describe('sanitizeResponse', () => {
  it('removes passwordHash from nested API response objects', () => {
    const response = sanitizeResponse({
      users: [
        { id: 'user-1', email: 'user@example.com', passwordHash: 'hash' },
      ],
      projects: [
        {
          id: 'project-1',
          owner: { id: 'owner-1', passwordHash: 'owner-hash' },
          members: [
            {
              user: { id: 'member-1', passwordHash: 'member-hash' },
            },
          ],
          tasks: [
            {
              assignee: { id: 'assignee-1', passwordHash: 'assignee-hash' },
            },
          ],
          risks: [{ owner: { id: 'risk-owner', passwordHash: 'risk-hash' } }],
          issues: [
            { owner: { id: 'issue-owner', passwordHash: 'issue-hash' } },
          ],
          assumptions: [
            {
              owner: {
                id: 'assumption-owner',
                passwordHash: 'assumption-hash',
              },
            },
          ],
          dependencies: [
            {
              owner: {
                id: 'dependency-owner',
                passwordHash: 'dependency-hash',
              },
            },
          ],
        },
      ],
      dashboard: {
        assignedProjects: [],
        openIssues: [],
        openRisks: [],
      },
    });

    expect(JSON.stringify(response)).not.toContain('passwordHash');
    expect(JSON.stringify(response)).not.toContain('hash');
  });
});
