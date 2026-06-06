import { DataSource } from 'typeorm';
import { ProjectRole } from '../src/common/enums/project-role.enum';
import { TaskStatus } from '../src/common/enums/task-status.enum';
import {
  developmentSeedData,
  seedUuid,
  verifyRequiredEntities,
} from '../scripts/seed';

describe('Seed data verification', () => {
  it('defines the expected enterprise seed volumes', () => {
    expect(developmentSeedData.users).toHaveLength(6);
    expect(developmentSeedData.projects).toHaveLength(3);
    expect(developmentSeedData.memberships).toHaveLength(14);
    expect(
      Object.values(developmentSeedData.taskTitlesByProject).flat(),
    ).toHaveLength(30);
    expect(developmentSeedData.riskTitles).toHaveLength(10);
    expect(developmentSeedData.issueTitles).toHaveLength(5);
    expect(developmentSeedData.assumptionTitles).toHaveLength(5);
    expect(developmentSeedData.dependencyTitles).toHaveLength(5);
  });

  it('contains realistic named users, projects, and project teams', () => {
    expect(developmentSeedData.users.map((user) => user.roleName)).toEqual([
      'Program Manager',
      'Project Manager',
      'Delivery Lead',
      'Technical Lead',
      'Engineer',
      'QA Engineer',
    ]);
    expect(developmentSeedData.projects.map((project) => project.name)).toEqual([
      'Customer Experience Platform Upgrade',
      'Observability Transformation Programme',
      'Data Centre Exit Programme',
    ]);
    expect(developmentSeedData.memberships).toContainEqual([
      'Customer Experience Platform Upgrade',
      'project.manager@example.com',
      ProjectRole.Owner,
    ]);
  });

  it('uses deterministic UUIDs and valid project references', () => {
    expect(seedUuid('user-project-manager')).toBe(
      developmentSeedData.users[1].id,
    );

    const projectNames = new Set(
      developmentSeedData.projects.map((project) => project.name),
    );
    const userEmails = new Set(developmentSeedData.users.map((user) => user.email));

    for (const [projectName, email] of developmentSeedData.memberships) {
      expect(projectNames.has(projectName)).toBe(true);
      expect(userEmails.has(email)).toBe(true);
    }
  });

  it('covers the required task status mix', () => {
    const statusCycle = [
      TaskStatus.Todo,
      TaskStatus.InProgress,
      TaskStatus.Blocked,
      TaskStatus.Done,
      TaskStatus.Todo,
      TaskStatus.InProgress,
    ];

    expect(new Set(statusCycle)).toEqual(
      new Set([
        TaskStatus.Todo,
        TaskStatus.InProgress,
        TaskStatus.Blocked,
        TaskStatus.Done,
      ]),
    );
  });

  it('verifies required entity metadata is present', () => {
    const dataSource = {
      entityMetadatas: developmentSeedData.requiredEntityNames.map((targetName) => ({
        targetName,
      })),
    } as DataSource;

    expect(() => verifyRequiredEntities(dataSource)).not.toThrow();
  });

  it('fails fast when required entity metadata is missing', () => {
    const dataSource = {
      entityMetadatas: [{ targetName: 'User' }],
    } as DataSource;

    expect(() => verifyRequiredEntities(dataSource)).toThrow(
      /Seed DataSource missing entity metadata/,
    );
  });
});
