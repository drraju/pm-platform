import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({ isArray: true, type: String })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys: string[];
}
