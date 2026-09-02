import { Module } from '@nestjs/common';
import { getJwtConfiguration } from '../auth/jwt-configuration';
import { ExternalApiGuard } from './auth/external-api.guard';
import { ExternalApiPolicyService } from './auth/external-api-policy.service';
import { ExternalCursorCodec } from './contracts/external-cursor';
import { ExternalPaginationPolicy } from './contracts/external-page.dto';
import { ExternalV1Controller } from './external-v1.controller';
import { ExternalDataScopeService } from './scope/external-data-scope';

@Module({
  controllers: [ExternalV1Controller],
  providers: [
    ExternalApiGuard,
    ExternalApiPolicyService,
    ExternalDataScopeService,
    ExternalPaginationPolicy,
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
