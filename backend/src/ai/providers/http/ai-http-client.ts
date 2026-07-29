import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AIHttpConfiguration,
  AIHttpException,
  AIHttpRequest,
  AIHttpResponse,
  AI_HTTP_FETCH,
} from './ai-http.types';
import type { AIHttpFetch } from './ai-http.types';

@Injectable()
export class AIHttpClient {
  constructor(
    @Optional()
    @Inject(AI_HTTP_FETCH)
    private readonly fetcher: AIHttpFetch = fetch,
  ) {}

  async send<TBody = unknown>(
    configuration: AIHttpConfiguration,
    request: AIHttpRequest,
  ): Promise<AIHttpResponse<TBody>> {
    const startedAt = Date.now();
    let attempts = 0;
    let lastError: unknown;

    while (attempts <= configuration.maxRetries) {
      attempts += 1;

      try {
        const response = await this.sendOnce<TBody>(configuration, request);

        return {
          ...response,
          diagnostics: {
            attempts,
            durationMs: Date.now() - startedAt,
            status: response.status,
          },
        };
      } catch (error) {
        lastError = error;

        if (
          error instanceof AIHttpException &&
          (!error.retryable || attempts > configuration.maxRetries)
        ) {
          throw error;
        }

        if (!(error instanceof AIHttpException)) {
          throw error;
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new AIHttpException({
      category: 'system',
      code: 'AI_HTTP_REQUEST_FAILED',
      message: 'AI HTTP request failed.',
      retryable: false,
    });
  }

  private async sendOnce<TBody>(
    configuration: AIHttpConfiguration,
    request: AIHttpRequest,
  ): Promise<AIHttpResponse<TBody>> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      configuration.timeoutMs,
    );

    try {
      const response = await this.fetcher(
        this.createUrl(configuration, request),
        {
          body:
            request.body === undefined
              ? undefined
              : JSON.stringify(request.body),
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': request.correlationId,
            ...(configuration.defaultHeaders ?? {}),
            ...(request.headers ?? {}),
          },
          method: request.method,
          signal: controller.signal,
        },
      );
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const body = await this.readBody(response);

      if (!response.ok) {
        throw this.toException(response.status, body);
      }

      return {
        body: body as TBody,
        diagnostics: {
          attempts: 1,
          durationMs: 0,
          status: response.status,
        },
        headers,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof AIHttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIHttpException({
          category: 'timeout',
          code: 'AI_HTTP_TIMEOUT',
          message: 'AI HTTP request timed out.',
          retryable: true,
        });
      }

      throw new AIHttpException({
        category: 'provider',
        code: 'AI_HTTP_REQUEST_FAILED',
        message:
          error instanceof Error ? error.message : 'AI HTTP request failed.',
        retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private createUrl(
    configuration: AIHttpConfiguration,
    request: AIHttpRequest,
  ): string {
    return `${configuration.baseUrl.replace(/\/$/, '')}/${request.path.replace(/^\//, '')}`;
  }

  private async readBody(
    response: Awaited<ReturnType<AIHttpFetch>>,
  ): Promise<unknown> {
    const text = await response.text();

    if (!text.trim()) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private toException(status: number, body: unknown): AIHttpException {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'object' &&
      body.error !== null &&
      'message' in body.error &&
      typeof body.error.message === 'string'
        ? body.error.message
        : `AI HTTP provider returned ${status}.`;

    if (status === 401 || status === 403) {
      return new AIHttpException({
        category: 'authentication',
        code: 'AI_HTTP_AUTHENTICATION_FAILED',
        message,
        retryable: false,
        status,
      });
    }

    if (status === 429) {
      return new AIHttpException({
        category: 'provider',
        code: 'AI_HTTP_RATE_LIMITED',
        message,
        retryable: true,
        status,
      });
    }

    return new AIHttpException({
      category: 'provider',
      code: status >= 500 ? 'AI_HTTP_PROVIDER_ERROR' : 'AI_HTTP_REQUEST_FAILED',
      message,
      retryable: status >= 500,
      status,
    });
  }
}
