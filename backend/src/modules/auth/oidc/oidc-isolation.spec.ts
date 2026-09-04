import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('OIDC protocol kernel isolation', () => {
  it('has no PM identity, session, authorization, or persistence dependency', () => {
    const productionFiles = [
      'google-oidc.client.ts',
      'google-oidc.configuration.ts',
      'google-oidc.controller.ts',
      'google-oidc-protocol.service.ts',
      'google-oidc.types.ts',
      'google-workspace-identity.validator.ts',
      'oidc-protocol.exception.ts',
      'oidc-random.source.ts',
      'oidc-redis.client.ts',
      'oidc-transaction.store.ts',
    ];
    const source = productionFiles
      .map((file) => readFileSync(join(__dirname, file), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/PmSessionIssuer|ExternalIdentity|UsersService/);
    expect(source).not.toMatch(
      /JwtService|roles|permissions|projectMembership/,
    );
    expect(source).not.toMatch(/modules\/users|typeorm|Repository</);
    expect(source).not.toMatch(
      /accessToken|refreshToken|access_token|refresh_token/,
    );
  });
});
