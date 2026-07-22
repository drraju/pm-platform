import { ProviderType } from './provider-type.enum';

export class IntegrationAudit {
  constructor(
    public readonly id: string,
    public readonly providerType: ProviderType,
    public readonly action: string,
    public readonly occurredAt: Date,
    public readonly actorId?: string,
    public readonly connectionId?: string,
    public readonly message?: string,
  ) {}
}
