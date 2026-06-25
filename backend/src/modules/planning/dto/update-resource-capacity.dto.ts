import { PartialType } from '@nestjs/swagger';
import { CreateResourceCapacityDto } from './create-resource-capacity.dto';

export class UpdateResourceCapacityDto extends PartialType(
  CreateResourceCapacityDto,
) {}
