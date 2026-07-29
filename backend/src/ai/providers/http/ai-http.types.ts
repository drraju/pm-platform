import type { AiErrorCategory } from '../../common';

export const AI_HTTP_FETCH = Symbol('AI_HTTP_FETCH');

export type AIHttpConfiguration = {
  baseUrl: string;
  defaultHeaders?: Readonly<Record<string, string>>;
  maxRetries: number;
  timeoutMs: number;
};

export type AIHttpRequest = {
  body?: unknown;
  correlationId: string;
  headers?: Readonly<Record<string, string>>;
  method: 'GET' | 'POST';
  path: string;
};

export type AIHttpResponse<TBody = unknown> = {
  body: TBody;
  diagnostics: {
    attempts: number;
    durationMs: number;
    status: number;
  };
  headers: Readonly<Record<string, string>>;
  status: number;
};

export type AIHttpExceptionCode =
  | 'AI_HTTP_AUTHENTICATION_FAILED'
  | 'AI_HTTP_RATE_LIMITED'
  | 'AI_HTTP_TIMEOUT'
  | 'AI_HTTP_PROVIDER_ERROR'
  | 'AI_HTTP_REQUEST_FAILED';

export class AIHttpException extends Error {
  readonly category: AiErrorCategory;
  readonly code: AIHttpExceptionCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(input: {
    category: AiErrorCategory;
    code: AIHttpExceptionCode;
    message: string;
    retryable: boolean;
    status?: number;
  }) {
    super(input.message);
    this.category = input.category;
    this.code = input.code;
    this.retryable = input.retryable;
    this.status = input.status;
  }
}

export type AIHttpFetch = (
  input: string,
  init: {
    body?: string;
    headers: Record<string, string>;
    method: string;
    signal: AbortSignal;
  },
) => Promise<{
  headers: {
    forEach(callback: (value: string, key: string) => void): void;
  };
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;
