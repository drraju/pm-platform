import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { RaidService } from './raid.service';

@ApiTags('raid')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('raid')
export class RaidController {
  constructor(private readonly raidService: RaidService) {}

  @Get()
  @ApiOkResponse()
  findAll() {
    return this.raidService.findAll();
  }

  @Post()
  @ApiCreatedResponse()
  create(@Body() createRaidItemDto: CreateRaidItemDto) {
    return this.raidService.create(createRaidItemDto);
  }
}
