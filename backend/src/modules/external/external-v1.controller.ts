import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExternalApiGuard } from './auth/external-api.guard';
import { EXTERNAL_V1_BASE_PATH } from './external.constants';

@ApiTags('external-v1')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ExternalApiGuard)
@Controller(EXTERNAL_V1_BASE_PATH)
export class ExternalV1Controller {}
