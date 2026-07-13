import { ResourceSkillController } from '../resource-skill.controller';
import { ResourceSkillApiService } from '../resource-skill-api.service';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';

describe('ResourceSkillController', () => {
  let controller: ResourceSkillController;
  let service: Record<keyof ResourceSkillApiService, jest.Mock>;

  beforeEach(() => {
    service = {
      createResourceSkill: jest.fn(),
      deleteResourceSkill: jest.fn(),
      getResourceSkill: jest.fn(),
      listResourceSkills: jest.fn(),
      listResourceSkillsByResource: jest.fn(),
      listResourceSkillsBySkill: jest.fn(),
      updateResourceSkill: jest.fn(),
    };

    controller = new ResourceSkillController(
      service as unknown as ResourceSkillApiService,
    );
  });

  it('forwards authenticated write operations to the API service', async () => {
    const request = {
      user: {
        email: 'admin@example.com',
        roleId: 'admin-role-id',
        userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      },
    } as any;

    await controller.createResourceSkill(request, {
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
      yearsExperience: 5,
    });
    await controller.updateResourceSkill(request, 'resource-skill-id', {
      monthsExperience: 8,
      notes: 'Updated notes',
    });
    await controller.deleteResourceSkill(request, 'resource-skill-id');

    expect(service.createResourceSkill).toHaveBeenCalledWith(
      {
        proficiencyLevel: SkillProficiencyLevel.Advanced,
        resourceId: 'resource-id',
        skillId: 'skill-id',
        status: ResourceSkillStatus.Active,
        yearsExperience: 5,
      },
      request.user,
    );
    expect(service.updateResourceSkill).toHaveBeenCalledWith(
      'resource-skill-id',
      {
        monthsExperience: 8,
        notes: 'Updated notes',
      },
      request.user,
    );
    expect(service.deleteResourceSkill).toHaveBeenCalledWith(
      'resource-skill-id',
      request.user,
    );
  });

  it('forwards read operations and query filters to the API service', async () => {
    await controller.listResourceSkills({
      includeArchived: true,
      proficiencyLevel: SkillProficiencyLevel.Intermediate,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
    });
    await controller.getResourceSkill('resource-skill-id');
    await controller.listResourceSkillsByResource('resource-id');
    await controller.listResourceSkillsBySkill('skill-id');

    expect(service.listResourceSkills).toHaveBeenCalledWith({
      includeArchived: true,
      proficiencyLevel: SkillProficiencyLevel.Intermediate,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
    });
    expect(service.getResourceSkill).toHaveBeenCalledWith('resource-skill-id');
    expect(service.listResourceSkillsByResource).toHaveBeenCalledWith(
      'resource-id',
    );
    expect(service.listResourceSkillsBySkill).toHaveBeenCalledWith('skill-id');
  });
});
