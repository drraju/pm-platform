import { AiProviderHealthDiagnostics } from './ai-provider.types';

export interface AiProviderHealthCheck {
  checkHealth(providerId: string): Promise<AiProviderHealthDiagnostics>;
}
