import { IntegrationStatus } from './integration-status.enum';
import { ProviderType } from './provider-type.enum';

export class ConnectionHealth {
  constructor(
    public readonly providerType: ProviderType,
    public readonly status: IntegrationStatus,
    public readonly checkedAt: Date,
    public readonly message?: string,
  ) {}

  static notImplemented(providerType: ProviderType): ConnectionHealth {
    return new ConnectionHealth(
      providerType,
      IntegrationStatus.NOT_IMPLEMENTED,
      new Date(),
      'Provider placeholder is registered but not implemented.',
    );
  }
}
