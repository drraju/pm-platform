import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Risk } from '../raid/entities/risk.entity';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RisksService } from './risks.service';

@ApiTags('risks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post()
  @ApiCreatedResponse({ type: Risk })
  create(@Body() createRiskDto: CreateRiskDto): Promise<Risk> {
    return this.risksService.create(createRiskDto);
  }

  @Get()
  @ApiOkResponse({ type: Risk, isArray: true })
  findAll(): Promise<Risk[]> {
    return this.risksService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: Risk })
  findOne(@Param('id') id: string): Promise<Risk> {
    return this.risksService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Risk })
  update(
    @Param('id') id: string,
    @Body() updateRiskDto: UpdateRiskDto,
  ): Promise<Risk> {
    return this.risksService.update(id, updateRiskDto);
  }

  @Delete(':id')
  @ApiOkResponse()
  remove(@Param('id') id: string): Promise<void> {
    return this.risksService.remove(id);
  }
}
