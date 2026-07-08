import { BadRequestException } from '@nestjs/common';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';
import { ResourceValidationService } from '../resource-validation.service';

describe('ResourceValidationService', () => {
  let service: ResourceValidationService;

  beforeEach(() => {
    service = new ResourceValidationService();
  });

  it('accepts valid resource domain metadata', () => {
    expect(() =>
      service.validateResource({
        name: 'Senior Engineer',
        resourceType: ResourceType.Human,
        roleName: 'Engineering',
        status: ResourceStatus.Active,
        userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      }),
    ).not.toThrow();
  });

  it('rejects a blank resource name', () => {
    expect(() => service.validateResource({ name: '   ' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects unsupported resource type and status values', () => {
    expect(() =>
      service.validateResource({ resourceType: 'unsupported' }),
    ).toThrow(BadRequestException);

    expect(() => service.validateResource({ status: 'unsupported' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid user links', () => {
    expect(() => service.validateResource({ userId: 'not-a-uuid' })).toThrow(
      BadRequestException,
    );
  });
});
