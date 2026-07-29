import { Injectable } from '@nestjs/common';

@Injectable()
export class APIKeyAuthenticationProvider {
  createAuthorizationHeaders(
    apiKey: string | undefined,
  ): Readonly<Record<string, string>> {
    if (!apiKey?.trim()) {
      return Object.freeze({});
    }

    return Object.freeze({
      Authorization: `Bearer ${apiKey}`,
    });
  }

  validate(apiKey: string | undefined): readonly string[] {
    return apiKey?.trim() ? [] : ['API key is not configured.'];
  }
}
