import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateResourceDto,
  QueryResourcesDto,
  UpdateResourceDto,
} from '../dto/resource.dto';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';

describe('Resource DTO validation', () => {
  it('accepts a valid create resource payload', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      description: 'Builds delivery services',
      name: 'Senior Engineer',
      resourceType: ResourceType.Human,
      roleName: 'Engineering',
      status: ResourceStatus.Active,
      userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid enum and uuid values', async () => {
    const dto = plainToInstance(CreateResourceDto, {
      name: 'Invalid Resource',
      resourceType: 'unsupported',
      userId: 'not-a-uuid',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['resourceType', 'userId']),
    );
  });

  it('accepts partial update payloads', async () => {
    const dto = plainToInstance(UpdateResourceDto, {
      description: 'Updated profile',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('transforms and validates supported query filters', async () => {
    const dto = plainToInstance(QueryResourcesDto, {
      includeArchived: 'true',
      resourceType: ResourceType.Team,
      search: 'delivery',
      status: ResourceStatus.Inactive,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.includeArchived).toBe(true);
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryResourcesDto, {
      includeArchived: 'maybe',
      status: 'unsupported',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['includeArchived', 'status']),
    );
  });
});
