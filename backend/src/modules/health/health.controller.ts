import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from '../../app.service';
import { OperationalHealthService } from './operational-health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly appService: AppService,
    private readonly operationalHealthService: OperationalHealthService,
  ) {}

  @Get()
  @ApiOkResponse()
  async getHealth() {
    const dependencyReport = await this.operationalHealthService.getReport();

    return {
      ...dependencyReport,
      app: this.appService.getHealthSnapshot(),
    };
  }
}
