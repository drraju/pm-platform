import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

export const OIDC_RANDOM_SOURCE = Symbol('OIDC_RANDOM_SOURCE');

export interface OidcRandomSourcePort {
  browserCorrelation(): string;
  codeVerifier(): string;
  nonce(): string;
  state(): string;
  transactionId(): string;
}

@Injectable()
export class OidcRandomSource implements OidcRandomSourcePort {
  browserCorrelation(): string {
    return randomBytes(32).toString('base64url');
  }

  codeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  handoffReference(): string {
    return randomBytes(32).toString('base64url');
  }

  nonce(): string {
    return randomBytes(32).toString('base64url');
  }

  state(): string {
    return randomBytes(32).toString('base64url');
  }

  transactionId(): string {
    return randomBytes(32).toString('base64url');
  }
}
