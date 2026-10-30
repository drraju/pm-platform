import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { customerStatuses } from '../customer-access';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ enum: customerStatuses })
  @IsOptional()
  @IsIn(customerStatuses)
  status?: (typeof customerStatuses)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renewalDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastTouch?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  commercialNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  successNote?: string | null;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: customerStatuses })
  @IsOptional()
  @IsIn(customerStatuses)
  status?: (typeof customerStatuses)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  domain?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renewalDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastTouch?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  commercialNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  successNote?: string | null;
}

export class CustomerListQueryDto {
  @ApiPropertyOptional({ enum: [...customerStatuses, 'all'] })
  @IsOptional()
  @IsIn([...customerStatuses, 'all'])
  status?: (typeof customerStatuses)[number] | 'all';
}
