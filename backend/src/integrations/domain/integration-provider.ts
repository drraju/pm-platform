import { AuthenticationType } from './authentication-type.enum';
import { IntegrationStatus } from './integration-status.enum';
import { ProviderCapabilities } from './provider-capabilities';
import { ProviderType } from './provider-type.enum';
import { SynchronizationPolicy } from './synchronization-policy';

export class IntegrationProvider {
  constructor(
    public readonly type: ProviderType,
    public readonly name: string,
    public readonly authenticationType: AuthenticationType,
    public readonly status: IntegrationStatus,
    public readonly capabilities: ProviderCapabilities,
    public readonly synchronizationPolicy: SynchronizationPolicy,
  ) {}
}
