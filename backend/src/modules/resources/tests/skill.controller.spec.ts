import { SkillController } from '../skill.controller';
import { SkillApiService } from '../skill-api.service';
import { SkillStatus } from '../enums/skill-status.enum';

describe('SkillController', () => {
  let controller: SkillController;
  let service: Record<keyof SkillApiService, jest.Mock>;

  beforeEach(() => {
    service = {
      createSkill: jest.fn(),
      deleteSkill: jest.fn(),
      getSkill: jest.fn(),
      listSkills: jest.fn(),
      updateSkill: jest.fn(),
    };

    controller = new SkillController(service as unknown as SkillApiService);
  });

  it('forwards authenticated write operations to the API service', async () => {
    const request = {
      user: {
        email: 'admin@example.com',
        roleId: 'admin-role-id',
        userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      },
    } as any;

    await controller.createSkill(request, {
      category: 'Engineering',
      name: 'TypeScript',
      status: SkillStatus.Active,
    });
    await controller.updateSkill(request, 'skill-id', {
      category: 'Architecture',
    });
    await controller.deleteSkill(request, 'skill-id');

    expect(service.createSkill).toHaveBeenCalledWith(
      {
        category: 'Engineering',
        name: 'TypeScript',
        status: SkillStatus.Active,
      },
      request.user,
    );
    expect(service.updateSkill).toHaveBeenCalledWith(
      'skill-id',
      { category: 'Architecture' },
      request.user,
    );
    expect(service.deleteSkill).toHaveBeenCalledWith('skill-id', request.user);
  });

  it('forwards read operations and query filters to the API service', async () => {
    await controller.listSkills({
      category: 'Engineering',
      includeArchived: true,
      search: 'type',
      status: SkillStatus.Deprecated,
    });
    await controller.getSkill('skill-id');

    expect(service.listSkills).toHaveBeenCalledWith({
      category: 'Engineering',
      includeArchived: true,
      search: 'type',
      status: SkillStatus.Deprecated,
    });
    expect(service.getSkill).toHaveBeenCalledWith('skill-id');
  });
});
