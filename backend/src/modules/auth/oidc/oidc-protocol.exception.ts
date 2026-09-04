import { HttpException } from '@nestjs/common';
import { OidcErrorCategory } from './google-oidc.types';

const statuses: Record<OidcErrorCategory, number> = {
  access_denied: 403,
  authentication_failed: 401,
  ineligible_account: 403,
  invalid_request: 400,
  transaction_expired: 400,
};

export class OidcProtocolException extends HttpException {
  constructor(readonly category: OidcErrorCategory) {
    super({ error: category }, statuses[category]);
  }
}
