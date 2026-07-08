import { BadRequestException, Injectable } from '@nestjs/common';
import { ResourceStatus } from './enums/resource-status.enum';
import { ResourceType } from './enums/resource-type.enum';

export type ResourceValidationInput = {
  description?: string | null;
  name?: string | null;
  resourceType?: ResourceType | string | null;
  roleName?: string | null;
  status?: ResourceStatus | string | null;
  userId?: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ResourceValidationService {
  validateResource(input: ResourceValidationInput) {
    if (input.name !== undefined) {
      this.validateText(input.name, 'Resource name', true, 255);
    }

    if (input.resourceType !== undefined && input.resourceType !== null) {
      this.validateAllowedValue(
        input.resourceType,
        Object.values(ResourceType),
        'resource type',
      );
    }

    if (input.status !== undefined && input.status !== null) {
      this.validateAllowedValue(
        input.status,
        Object.values(ResourceStatus),
        'status',
      );
    }

    if (input.userId !== undefined && input.userId !== null) {
      this.validateUuid(input.userId, 'Resource user id');
    }

    if (input.roleName !== undefined && input.roleName !== null) {
      this.validateText(input.roleName, 'Resource role name', false, 255);
    }
  }

  private validateAllowedValue(
    value: string,
    allowedValues: string[],
    fieldName: string,
  ) {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(`Unsupported resource ${fieldName}`);
    }
  }

  private validateText(
    value: string | null | undefined,
    fieldLabel: string,
    required: boolean,
    maxLength: number,
  ) {
    const trimmedValue = value?.trim();
    if (required && !trimmedValue) {
      throw new BadRequestException(`${fieldLabel} is required`);
    }

    if (trimmedValue && trimmedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldLabel} must be at most ${maxLength} characters`,
      );
    }
  }

  private validateUuid(value: string, fieldLabel: string) {
    if (!uuidPattern.test(value)) {
      throw new BadRequestException(`${fieldLabel} must be a UUID`);
    }
  }
}
