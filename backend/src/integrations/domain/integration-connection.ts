import { IntegrationStatus } from './integration-status.enum';
import { ProviderType } from './provider-type.enum';

export class IntegrationConnection {
  constructor(
    public readonly id: string,
    public readonly providerType: ProviderType,
    public readonly status: IntegrationStatus,
    public readonly configuration: Readonly<Record<string, unknown>>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
