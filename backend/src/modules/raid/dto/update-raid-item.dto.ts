import { PartialType } from '@nestjs/swagger';
import { CreateRaidItemDto } from './create-raid-item.dto';

export class UpdateRaidItemDto extends PartialType(CreateRaidItemDto) {}
