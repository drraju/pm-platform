import { AiCapability, AiScope } from '../common';

export type AiAuthorizationDecision = {
  allowed: boolean;
  reason?: string;
};

export interface AuthorizationProvider {
  authorizeCapability(
    capability: AiCapability,
    scope: AiScope,
  ): Promise<AiAuthorizationDecision>;
}
