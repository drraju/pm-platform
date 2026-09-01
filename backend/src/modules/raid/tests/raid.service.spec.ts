import { ForbiddenException } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { Assumption } from '../entities/assumption.entity';
import { Dependency } from '../entities/dependency.entity';
import { Issue } from '../entities/issue.entity';
import { RaidComment } from '../entities/raid-comment.entity';
import { RaidHistoryEntry } from '../entities/raid-history-entry.entity';
import { Risk } from '../entities/risk.entity';
import { RaidModule } from '../raid.module';
import { RaidService } from '../raid.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

type RaidServiceInternals = {
  normalizeHistoryValue(value: unknown): string | null;
};

describe('RaidService', () => {
  it.todo('defines RAID register behavior');

  let service: RaidService;
  let risksRepository: MockRepository<Risk>;
  let issuesRepository: MockRepository<Issue>;
  let assumptionsRepository: MockRepository<Assumption>;
  let dependenciesRepository: MockRepository<Dependency>;
  let raidCommentsRepository: MockRepository<RaidComment>;
  let raidHistoryRepository: MockRepository<RaidHistoryEntry>;
  let authorizationPolicyService: {
    canContributeRaid: jest.Mock;
    canManageRaid: jest.Mock;
    hasPermission: jest.Mock;
    isExternalActor: jest.Mock;
  };
  let projectVisibilityService: Pick<
    ProjectVisibilityService,
    'canViewProject' | 'getVisibleProjectIds'
  >;

  beforeEach(async () => {
    risksRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };
    issuesRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };
    assumptionsRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };
    dependenciesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };
    raidCommentsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (input) => input),
    };
    raidHistoryRepository = {
      create: jest.fn((input) => input),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (input) => input),
    };
    risksRepository.findOne = jest.fn();
    issuesRepository.findOne = jest.fn();
    assumptionsRepository.findOne = jest.fn();
    dependenciesRepository.findOne = jest.fn();
    authorizationPolicyService = {
      canContributeRaid: jest.fn().mockResolvedValue(true),
      canManageRaid: jest.fn().mockResolvedValue(false),
      hasPermission: jest.fn().mockResolvedValue(false),
      isExternalActor: jest.fn().mockResolvedValue(false),
    };
    projectVisibilityService = {
      canViewProject: jest.fn(),
      getVisibleProjectIds: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RaidService,
        { provide: getRepositoryToken(Risk), useValue: risksRepository },
        { provide: getRepositoryToken(Issue), useValue: issuesRepository },
        {
          provide: getRepositoryToken(Assumption),
          useValue: assumptionsRepository,
        },
        {
          provide: getRepositoryToken(Dependency),
          useValue: dependenciesRepository,
        },
        {
          provide: getRepositoryToken(RaidComment),
          useValue: raidCommentsRepository,
        },
        {
          provide: getRepositoryToken(RaidHistoryEntry),
          useValue: raidHistoryRepository,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
        {
          provide: ProjectVisibilityService,
          useValue: projectVisibilityService,
        },
      ],
    }).compile();

    service = moduleRef.get(RaidService);
  });

  it('returns all RAID items for roles with all-project visibility', async () => {
    jest
      .spyOn(projectVisibilityService, 'getVisibleProjectIds')
      .mockResolvedValue('all');
    risksRepository.find?.mockResolvedValue([
      { id: 'risk-1', createdAt: new Date('2026-01-04T00:00:00Z') },
    ]);
    issuesRepository.find?.mockResolvedValue([
      { id: 'issue-1', createdAt: new Date('2026-01-03T00:00:00Z') },
    ]);
    assumptionsRepository.find?.mockResolvedValue([
      { id: 'assumption-1', createdAt: new Date('2026-01-02T00:00:00Z') },
    ]);
    dependenciesRepository.find?.mockResolvedValue([
      { id: 'dependency-1', createdAt: new Date('2026-01-01T00:00:00Z') },
    ]);

    await expect(
      service.findAll({
        roleId: 'role-EXECUTIVE',
        userId: 'executive-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'risk-1' }),
      expect.objectContaining({ id: 'issue-1' }),
      expect.objectContaining({ id: 'assumption-1' }),
      expect.objectContaining({ id: 'dependency-1' }),
    ]);
    expect(risksRepository.find).toHaveBeenCalledWith({
      relations: { project: true, owner: true },
    });
    expect(raidCommentsRepository.find).toHaveBeenCalled();
    expect(raidHistoryRepository.find).toHaveBeenCalled();
  });

  it('filters global RAID aggregation by visible project ids', async () => {
    jest
      .spyOn(projectVisibilityService, 'getVisibleProjectIds')
      .mockResolvedValue(['project-1', 'project-2']);
    risksRepository.find?.mockResolvedValue([]);
    issuesRepository.find?.mockResolvedValue([]);
    assumptionsRepository.find?.mockResolvedValue([]);
    dependenciesRepository.find?.mockResolvedValue([]);

    await service.findAll({ roleId: 'role-1', userId: 'customer-1' });

    expect(risksRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { project: true, owner: true },
        where: { projectId: expect.any(Object) },
      }),
    );
    expect(issuesRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: expect.any(Object) },
      }),
    );
  });

  it('returns no RAID items when the actor has no visible projects', async () => {
    jest
      .spyOn(projectVisibilityService, 'getVisibleProjectIds')
      .mockResolvedValue([]);

    await expect(
      service.findAll({ roleId: 'role-1', userId: 'customer-1' }),
    ).resolves.toEqual([]);
    expect(risksRepository.find).not.toHaveBeenCalled();
    expect(issuesRepository.find).not.toHaveBeenCalled();
  });

  it('returns no RAID register data to external actors', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValueOnce(true);

    await expect(
      service.findAll({ roleId: 'customer-role', userId: 'customer-1' }),
    ).resolves.toEqual([]);
    expect(risksRepository.find).not.toHaveBeenCalled();
    expect(issuesRepository.find).not.toHaveBeenCalled();
  });

  it('denies Executive RAID create, update, comment, and delete after deliberate permission grants are filtered', async () => {
    const executiveActor = {
      roleId: 'role-EXECUTIVE',
      userId: 'executive-1',
    };
    authorizationPolicyService.canContributeRaid.mockResolvedValue(false);
    authorizationPolicyService.canManageRaid.mockResolvedValue(false);
    authorizationPolicyService.hasPermission.mockResolvedValue(false);
    risksRepository.findOne?.mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00Z'),
      id: 'risk-1',
      ownerId: executiveActor.userId,
      projectId: 'project-1',
      status: 'open',
      title: 'Executive-owned risk',
      type: RaidType.Risk,
    });
    jest
      .spyOn(projectVisibilityService, 'canViewProject')
      .mockResolvedValue(true);

    const mutations = [
      () =>
        service.create(
          {
            projectId: 'project-1',
            title: 'Forbidden risk',
            type: RaidType.Risk,
          },
          executiveActor,
        ),
      () => service.update('risk-1', { status: 'mitigating' }, executiveActor),
      () =>
        service.addComment(
          'risk-1',
          { body: 'Forbidden comment' },
          executiveActor,
        ),
      () => service.remove('risk-1', executiveActor),
    ];

    for (const mutate of mutations) {
      await expect(mutate()).rejects.toBeInstanceOf(ForbiddenException);
    }

    expect(risksRepository.save).not.toHaveBeenCalled();
    expect(risksRepository.softRemove).not.toHaveBeenCalled();
    expect(raidCommentsRepository.save).not.toHaveBeenCalled();
    expect(raidHistoryRepository.save).not.toHaveBeenCalled();
  });

  it('updates an owned RAID item when the actor has item-level update permission', async () => {
    risksRepository.findOne?.mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00Z'),
      id: 'risk-1',
      ownerId: 'user-1',
      projectId: 'project-1',
      title: 'Legacy risk',
      type: 'risk',
    });
    risksRepository.save?.mockImplementation(async (item) => item);
    jest
      .spyOn(projectVisibilityService, 'canViewProject')
      .mockResolvedValue(true);
    authorizationPolicyService.hasPermission.mockResolvedValue(true);

    await expect(
      service.update(
        'risk-1',
        { status: 'mitigating', title: 'Updated risk' },
        { roleId: 'role-1', userId: 'user-1' },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        history: expect.any(Array),
        status: 'mitigating',
        title: 'Updated risk',
      }),
    );
    expect(raidHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'status_changed',
        fieldName: 'status',
      }),
    );
  });

  it('blocks update of another owner RAID item without any-update permission', async () => {
    risksRepository.findOne?.mockResolvedValue({
      id: 'risk-1',
      ownerId: 'other-user',
      projectId: 'project-1',
      type: 'risk',
    });
    jest
      .spyOn(projectVisibilityService, 'canViewProject')
      .mockResolvedValue(true);

    await expect(
      service.update(
        'risk-1',
        { status: 'mitigating' },
        { roleId: 'role-1', userId: 'user-1' },
      ),
    ).rejects.toThrow('Insufficient RAID update permissions');
  });

  it('deletes a RAID item only with delete permission', async () => {
    issuesRepository.findOne?.mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00Z'),
      id: 'issue-1',
      ownerId: 'user-1',
      projectId: 'project-1',
      type: 'issue',
    });
    jest
      .spyOn(projectVisibilityService, 'canViewProject')
      .mockResolvedValue(true);
    authorizationPolicyService.canManageRaid.mockResolvedValue(true);
    authorizationPolicyService.hasPermission.mockResolvedValue(true);

    await service.remove('issue-1', { roleId: 'role-1', userId: 'user-1' });

    expect(issuesRepository.softRemove).toHaveBeenCalledWith(
      expect.objectContaining({ deletedById: 'user-1', id: 'issue-1' }),
    );
    expect(raidHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deleted' }),
    );
  });

  it('adds RAID comments and records them in history', async () => {
    risksRepository.findOne?.mockResolvedValue({
      createdAt: new Date('2026-01-01T00:00:00Z'),
      id: 'risk-1',
      ownerId: 'user-1',
      projectId: 'project-1',
      status: 'open',
      title: 'Supplier risk',
      type: 'risk',
    });
    jest
      .spyOn(projectVisibilityService, 'canViewProject')
      .mockResolvedValue(true);
    authorizationPolicyService.hasPermission.mockResolvedValue(true);

    await expect(
      service.addComment(
        'risk-1',
        { body: 'Escalated with procurement.' },
        { roleId: 'role-1', userId: 'user-1' },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        comments: expect.any(Array),
        id: 'risk-1',
      }),
    );

    expect(raidCommentsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'user-1',
        body: 'Escalated with procurement.',
      }),
    );
    expect(raidHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'commented' }),
    );
  });

  describe('normalizeHistoryValue', () => {
    it('normalizes Date values to ISO strings', () => {
      expect(
        (service as unknown as RaidServiceInternals).normalizeHistoryValue(
          new Date('2026-01-01T12:30:45.000Z'),
        ),
      ).toBe('2026-01-01T12:30:45.000Z');
    });

    it('normalizes plain objects to JSON strings', () => {
      expect(
        (service as unknown as RaidServiceInternals).normalizeHistoryValue({
          level: 'high',
          owner: 'team-a',
        }),
      ).toBe('{"level":"high","owner":"team-a"}');
    });

    it('normalizes number and boolean values to strings', () => {
      const internals = service as unknown as RaidServiceInternals;

      expect(internals.normalizeHistoryValue(42)).toBe('42');
      expect(internals.normalizeHistoryValue(false)).toBe('false');
    });

    it('normalizes null and undefined values to null', () => {
      const internals = service as unknown as RaidServiceInternals;

      expect(internals.normalizeHistoryValue(null)).toBeNull();
      expect(internals.normalizeHistoryValue(undefined)).toBeNull();
    });
  });

  it('registers all RAID entities with TypeORM', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, RaidModule) as
      | Array<{ providers?: Array<{ provide?: unknown }> }>
      | undefined;
    const providers = imports?.flatMap(
      (moduleImport) => moduleImport.providers ?? [],
    );

    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: getRepositoryToken(Assumption) }),
        expect.objectContaining({ provide: getRepositoryToken(Dependency) }),
        expect.objectContaining({ provide: getRepositoryToken(Issue) }),
        expect.objectContaining({ provide: getRepositoryToken(RaidComment) }),
        expect.objectContaining({
          provide: getRepositoryToken(RaidHistoryEntry),
        }),
        expect.objectContaining({ provide: getRepositoryToken(Risk) }),
      ]),
    );
  });
});
