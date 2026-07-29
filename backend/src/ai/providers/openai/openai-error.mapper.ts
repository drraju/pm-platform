import { Injectable } from '@nestjs/common';
import { AiPlatformError } from '../../common';
import { AIHttpException } from '../http';

@Injectable()
export class OpenAIErrorMapper {
  toPlatformError(error: unknown, correlationId?: string): AiPlatformError {
    if (error instanceof AIHttpException) {
      return new AiPlatformError({
        category: error.category,
        code: this.toCode(error),
        correlationId,
        message: error.message,
        retryable: error.retryable,
        safeDetail: error.status ? `HTTP ${error.status}` : error.code,
      });
    }

    return new AiPlatformError({
      category: 'provider',
      code: 'AI_PROVIDER_EXCEPTION',
      correlationId,
      message: 'OpenAI provider execution failed.',
      retryable: false,
      safeDetail: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  private toCode(error: AIHttpException): string {
    if (error.code === 'AI_HTTP_AUTHENTICATION_FAILED') {
      return 'AI_AUTHENTICATION_EXCEPTION';
    }

    if (error.code === 'AI_HTTP_RATE_LIMITED') {
      return 'AI_RATE_LIMIT_EXCEPTION';
    }

    if (error.code === 'AI_HTTP_TIMEOUT') {
      return 'AI_TIMEOUT_EXCEPTION';
    }

    return 'AI_PROVIDER_EXCEPTION';
  }
}
