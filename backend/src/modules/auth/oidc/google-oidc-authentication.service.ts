import { Injectable } from '@nestjs/common';
import {
  GoogleIdentityLinkingPersistenceError,
  GoogleIdentityLinkingRejectedError,
  GoogleIdentityLinkingService,
} from '../../users/google-identity-linking.service';
import type { GoogleIdentityLinkingResult } from '../../users/google-identity-linking.service';
import { AuthenticationMethod } from '../authentication-method';
import { SessionDto } from '../dto/session.dto';
import { PmSessionIssuer } from '../pm-session-issuer.service';
import type { ValidatedGoogleIdentity } from './google-oidc.types';
import { OidcProtocolException } from './oidc-protocol.exception';

@Injectable()
export class GoogleOidcAuthenticationService {
  constructor(
    private readonly identityLinking: GoogleIdentityLinkingService,
    private readonly sessionIssuer: PmSessionIssuer,
  ) {}

  async authenticate(identity: ValidatedGoogleIdentity): Promise<SessionDto> {
    let linkedUser: GoogleIdentityLinkingResult;
    try {
      linkedUser = await this.identityLinking.resolveAndRecordAuthentication({
        issuer: identity.issuer,
        normalizedEmail: identity.normalizedEmail,
        subject: identity.subject,
      });
    } catch (error) {
      if (error instanceof GoogleIdentityLinkingRejectedError) {
        throw new OidcProtocolException('ineligible_account');
      }
      if (error instanceof GoogleIdentityLinkingPersistenceError) {
        throw new OidcProtocolException('authentication_failed');
      }
      throw new OidcProtocolException('authentication_failed');
    }

    return this.sessionIssuer.issue(
      linkedUser.principal,
      {
        authenticatedAt: Math.floor(Date.now() / 1000),
        authenticationMethod: AuthenticationMethod.Google,
      },
      {
        requiresPasswordChange: linkedUser.status === 'first_login_pending',
      },
    );
  }
}
