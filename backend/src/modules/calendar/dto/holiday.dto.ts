import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Christmas Day' })
  @IsString()
  name: string;
}

export class UpdateHolidayDto extends CreateHolidayDto {}

export class HolidayResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  calendarId: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
