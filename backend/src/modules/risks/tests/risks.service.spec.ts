import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { Risk } from '../../raid/entities/risk.entity';
import { RisksService } from '../risks.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('RisksService', () => {
  it.todo('defines risk management behavior');

  let service: RisksService;
  let risksRepository: MockRepository<Risk>;
  let projectVisibilityService: Pick<
    ProjectVisibilityService,
    'getVisibleProjectIds' | 'canViewProject'
  >;
  let authorizationPolicyService: {
    canContributeRaid: jest.Mock;
    canManageRaid: jest.Mock;
    hasPermission: jest.Mock;
    isExternalActor: jest.Mock;
  };

  beforeEach(async () => {
    risksRepository = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      save: jest.fn(),
    };
    projectVisibilityService = {
      getVisibleProjectIds: jest.fn(),
      canViewProject: jest.fn(),
    };
    authorizationPolicyService = {
      canContributeRaid: jest.fn().mockResolvedValue(true),
      canManageRaid: jest.fn().mockResolvedValue(true),
      hasPermission: jest.fn().mockResolvedValue(true),
      isExternalActor: jest.fn().mockResolvedValue(false),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RisksService,
        { provide: getRepositoryToken(Risk), useValue: risksRepository },
        {
          provide: ProjectVisibilityService,
          useValue: projectVisibilityService,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
      ],
    }).compile();

    service = moduleRef.get(RisksService);
  });

  it('filters global risk reads by visible project ids', async () => {
    jest
      .spyOn(projectVisibilityService, 'getVisibleProjectIds')
      .mockResolvedValue(['project-1']);
    risksRepository.find?.mockResolvedValue([]);

    await service.findAll({ roleId: 'role-1', userId: 'customer-1' });

    expect(risksRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { project: true, owner: true },
        where: { projectId: expect.any(Object) },
      }),
    );
  });

  it('returns no risks when the actor has no visible projects', async () => {
    jest
      .spyOn(projectVisibilityService, 'getVisibleProjectIds')
      .mockResolvedValue([]);

    await expect(
      service.findAll({ roleId: 'role-1', userId: 'customer-1' }),
    ).resolves.toEqual([]);
    expect(risksRepository.find).not.toHaveBeenCalled();
  });

  it('returns no risk register data to external actors', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValueOnce(true);

    await expect(
      service.findAll({ roleId: 'partner-role', userId: 'partner-1' }),
    ).resolves.toEqual([]);
    expect(risksRepository.find).not.toHaveBeenCalled();
  });

  it('hides a risk when the actor cannot view its project', async () => {
    risksRepository.findOne?.mockResolvedValue({
      id: 'risk-1',
      projectId: 'project-1',
    });
    jest
      .spyOn(projectVisibilityService, 'canViewProject')
      .mockResolvedValue(false);

    await expect(
      service.findOne('risk-1', { roleId: 'role-1', userId: 'customer-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a risk when the actor can view its project', async () => {
    risksRepository.findOne?.mockResolvedValue({
      id: 'risk-1',
      projectId: 'project-1',
    });
    jest
      .spyOn(projectVisibilityService, 'canViewProject')
      .mockResolvedValue(true);

    await expect(
      service.findOne('risk-1', { roleId: 'role-1', userId: 'customer-1' }),
    ).resolves.toEqual(expect.objectContaining({ id: 'risk-1' }));
  });
});
