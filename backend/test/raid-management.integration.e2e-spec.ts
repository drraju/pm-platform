import { Test, TestingModule } from '@nestjs/testing';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AuthorizationPolicyService } from '../src/common/authz/authorization-policy.service';
import { RaidController } from '../src/modules/raid/raid.controller';
import { RaidService } from '../src/modules/raid/raid.service';

describe('RAID management API integration', () => {
  let controller: RaidController;
  const request = {
    user: {
      email: 'project.manager@example.com',
      roleId: 'role-1',
      userId: 'user-1',
    },
  };
  const raidService = {
    create: jest.fn(),
    findAll: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RaidController],
      providers: [
        { provide: RaidService, useValue: raidService },
        {
          provide: AuthorizationPolicyService,
          useValue: {
            canManageRaid: jest.fn(),
            hasPermission: jest.fn(),
            hasAnyPermission: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleFixture.get(RaidController);
  });

  it('passes the authenticated actor to RAID reads and creates', async () => {
    raidService.findAll.mockResolvedValue([{ id: 'risk-1' }]);
    raidService.create.mockResolvedValue({ id: 'risk-2' });

    await controller.findAll(request as never);
    expect(raidService.findAll).toHaveBeenCalledWith(request.user);

    await controller.create(
      {
        projectId: 'project-1',
        title: 'Supplier onboarding delay',
        type: 'risk',
      } as never,
      request as never,
    );
    expect(raidService.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Supplier onboarding delay' }),
      request.user,
    );
  });

  it('exposes update and delete operations through the RAID controller', async () => {
    raidService.update.mockResolvedValue({ id: 'risk-1', status: 'mitigating' });
    raidService.remove.mockResolvedValue(undefined);

    await controller.update(
      'risk-1',
      { status: 'mitigating' },
      request as never,
    );
    expect(raidService.update).toHaveBeenCalledWith(
      'risk-1',
      { status: 'mitigating' },
      request.user,
    );

    await controller.remove('risk-1', request as never);
    expect(raidService.remove).toHaveBeenCalledWith('risk-1', request.user);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, RaidController.prototype.remove)).toBe(204);
  });
});
