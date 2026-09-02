import { SetMetadata } from '@nestjs/common';
import { ExternalApiResource } from './external-api-resource';

export const EXTERNAL_API_RESOURCE_KEY = 'externalApiResource';

export const RequireExternalApiResource = (resource: ExternalApiResource) =>
  SetMetadata(EXTERNAL_API_RESOURCE_KEY, resource);
