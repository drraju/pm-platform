import { PartialType } from '@nestjs/swagger';
import { CreateResourceAllocationDto } from './create-resource-allocation.dto';

export class UpdateResourceAllocationDto extends PartialType(
  CreateResourceAllocationDto,
) {}
