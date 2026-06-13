import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { Role } from '../../users/entities/role.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
import { ProjectVisibilityService } from '../project-visibility.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('ProjectVisibilityService', () => {
  let service: ProjectVisibilityService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let tasksRepository: MockRepository<Task>;
  let rolesRepository: MockRepository<Role>;

  beforeEach(async () => {
    projectsRepository = {
      find: jest.fn(),
    };
    projectMembersRepository = {
      find: jest.fn(),
    };
    tasksRepository = {
      find: jest.fn(),
    };
    rolesRepository = {
      findOne: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectVisibilityService,
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
      ],
    }).compile();

    service = moduleRef.get(ProjectVisibilityService);
  });

  it.each([
    'SUPER_ADMIN',
    'Admin',
    'Program Manager',
    'Portfolio Manager',
    'Executive',
  ])('grants all project visibility to %s', async (roleName) => {
    rolesRepository.findOne?.mockResolvedValue({
      id: 'role-1',
      name: roleName,
    });

    await expect(
      service.getVisibleProjectIds({
        roleId: 'role-1',
        userId: 'user-1',
      }),
    ).resolves.toBe('all');
    expect(projectMembersRepository.find).not.toHaveBeenCalled();
    expect(tasksRepository.find).not.toHaveBeenCalled();
  });

  it.each(['Team Member', 'Delivery Lead', 'Project Manager'])(
    'limits %s to owned, member, or task-assigned projects',
    async (roleName) => {
      rolesRepository.findOne?.mockResolvedValue({
        id: 'role-1',
        name: roleName,
      });
      projectsRepository.find?.mockResolvedValue([{ id: 'owned-project' }]);
      projectMembersRepository.find?.mockResolvedValue([
        { projectId: 'member-project' },
      ]);
      tasksRepository.find?.mockResolvedValue([
        { projectId: 'task-project' },
        { projectId: 'member-project' },
      ]);

      await expect(
        service.getVisibleProjectIds({
          roleId: 'role-1',
          userId: 'user-1',
        }),
      ).resolves.toEqual(['owned-project', 'member-project', 'task-project']);
    },
  );

  it.each(['Customer', 'Partner'])(
    'limits %s to owned or member projects without task-assignment expansion',
    async (roleName) => {
      rolesRepository.findOne?.mockResolvedValue({
        id: 'role-1',
        name: roleName,
      });
      projectsRepository.find?.mockResolvedValue([{ id: 'owned-project' }]);
      projectMembersRepository.find?.mockResolvedValue([
        { projectId: 'member-project' },
      ]);

      await expect(
        service.getVisibleProjectIds({
          roleId: 'role-1',
          userId: 'user-1',
        }),
      ).resolves.toEqual(['owned-project', 'member-project']);
      expect(tasksRepository.find).not.toHaveBeenCalled();
    },
  );

  it('returns task-assigned projects when no membership exists', async () => {
    rolesRepository.findOne?.mockResolvedValue({
      id: 'role-1',
      name: 'Team Member',
    });
    projectsRepository.find?.mockResolvedValue([]);
    projectMembersRepository.find?.mockResolvedValue([]);
    tasksRepository.find?.mockResolvedValue([{ projectId: 'task-project' }]);

    await expect(
      service.getVisibleProjectIds({
        roleId: 'role-1',
        userId: 'user-1',
      }),
    ).resolves.toEqual(['task-project']);
    await expect(
      service.canViewProject('task-project', {
        roleId: 'role-1',
        userId: 'user-1',
      }),
    ).resolves.toBe(true);
    await expect(
      service.canViewProject('unrelated-project', {
        roleId: 'role-1',
        userId: 'user-1',
      }),
    ).resolves.toBe(false);
  });
});
