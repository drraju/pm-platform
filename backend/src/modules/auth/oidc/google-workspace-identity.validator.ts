import { Inject, Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { GOOGLE_OIDC_CONFIGURATION } from './google-oidc.configuration';
import { GOOGLE_OIDC_ISSUER } from './google-oidc.types';
import type {
  GoogleIdentityClaims,
  GoogleOidcConfiguration,
  ValidatedGoogleIdentity,
} from './google-oidc.types';
import { OidcProtocolException } from './oidc-protocol.exception';

@Injectable()
export class GoogleWorkspaceIdentityValidator {
  constructor(
    @Inject(GOOGLE_OIDC_CONFIGURATION)
    private readonly configuration: GoogleOidcConfiguration,
  ) {}

  validate(claims: GoogleIdentityClaims): ValidatedGoogleIdentity {
    if (!this.configuration.enabled) {
      throw new OidcProtocolException('invalid_request');
    }
    if (
      claims.iss !== GOOGLE_OIDC_ISSUER ||
      !this.matchesAudience(claims.aud, this.configuration.clientId) ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp)
    ) {
      throw new OidcProtocolException('authentication_failed');
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      claims.iat! > now + this.configuration.clockToleranceSeconds ||
      claims.exp! <= now - this.configuration.clockToleranceSeconds
    ) {
      throw new OidcProtocolException('authentication_failed');
    }

    const subject = claims.sub?.trim();
    const normalizedEmail = claims.email?.trim().toLowerCase();
    const hostedDomain = claims.hd?.trim().toLowerCase();
    if (
      !subject ||
      !normalizedEmail ||
      claims.email_verified !== true ||
      !hostedDomain
    ) {
      throw new OidcProtocolException('ineligible_account');
    }

    const emailDomain = this.getEmailDomain(normalizedEmail);
    if (
      hostedDomain !== this.configuration.allowedDomain ||
      emailDomain !== this.configuration.allowedDomain
    ) {
      throw new OidcProtocolException('ineligible_account');
    }

    return {
      emailVerified: true,
      familyName: this.normalizeOptionalName(claims.family_name),
      givenName: this.normalizeOptionalName(claims.given_name),
      hostedDomain,
      issuer: GOOGLE_OIDC_ISSUER,
      normalizedEmail,
      provider: 'GOOGLE',
      subject,
    };
  }

  private matchesAudience(
    audience: string | string[] | undefined,
    clientId: string,
  ): boolean {
    return typeof audience === 'string'
      ? audience === clientId
      : Array.isArray(audience) && audience.includes(clientId);
  }

  private getEmailDomain(email: string): string | null {
    if (
      email.length > 254 ||
      !isEmail(email, { allow_utf8_local_part: false, require_tld: true })
    ) {
      return null;
    }
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return null;
    }
    return parts[1];
  }

  private normalizeOptionalName(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const name = value.trim();
    if (
      !name ||
      Array.from(name).length > 255 ||
      Array.from(name).some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
      })
    ) {
      return null;
    }
    return name;
  }
}
