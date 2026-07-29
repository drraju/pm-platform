import { AiErrorCategory, AiErrorPayload } from './types';

export class AiPlatformError extends Error {
  readonly category: AiErrorCategory;
  readonly code: string;
  readonly correlationId?: string;
  readonly retryable: boolean;
  readonly safeDetail?: string;

  constructor(payload: AiErrorPayload) {
    super(payload.message);
    this.name = 'AiPlatformError';
    this.category = payload.category;
    this.code = payload.code;
    this.correlationId = payload.correlationId;
    this.retryable = payload.retryable;
    this.safeDetail = payload.safeDetail;
  }

  toPayload(): AiErrorPayload {
    return {
      category: this.category,
      code: this.code,
      correlationId: this.correlationId,
      message: this.message,
      retryable: this.retryable,
      safeDetail: this.safeDetail,
    };
  }
}
