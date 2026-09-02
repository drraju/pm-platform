import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getJwtConfiguration } from '../auth/jwt-configuration';
import { Project } from '../projects/entities/project.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { Task } from '../tasks/entities/task.entity';
import { ExternalApiGuard } from './auth/external-api.guard';
import { ExternalApiPolicyService } from './auth/external-api-policy.service';
import { ExternalCursorCodec } from './contracts/external-cursor';
import { ExternalPaginationPolicy } from './contracts/external-page.dto';
import { ExternalV1Controller } from './external-v1.controller';
import { ExternalReadQueryService } from './external-read-query.service';
import { ExternalDataScopeService } from './scope/external-data-scope';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Task, Risk, Issue])],
  controllers: [ExternalV1Controller],
  providers: [
    ExternalApiGuard,
    ExternalApiPolicyService,
    ExternalDataScopeService,
    ExternalPaginationPolicy,
    ExternalReadQueryService,
    {
      provide: ExternalCursorCodec,
      useFactory: () =>
        new ExternalCursorCodec(getJwtConfiguration().accessSecret),
    },
  ],
  exports: [
    ExternalApiGuard,
    ExternalApiPolicyService,
    ExternalCursorCodec,
    ExternalDataScopeService,
    ExternalPaginationPolicy,
  ],
})
export class ExternalModule {}
