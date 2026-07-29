import { AiRequest } from '../common';

export type AiAuditReference = {
  id: string;
};

export interface AuditProvider {
  startAudit(request: AiRequest): Promise<AiAuditReference>;
}
