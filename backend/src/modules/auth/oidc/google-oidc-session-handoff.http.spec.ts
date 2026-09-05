/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GoogleOidcAuthenticationService } from './google-oidc-authentication.service';
import { GoogleOidcController } from './google-oidc.controller';
import { GoogleOidcProtocolService } from './google-oidc-protocol.service';
import { GoogleOidcSessionHandoffService } from './google-oidc-session-handoff.service';

describe('Google OIDC session handoff HTTP contract', () => {
  let app: INestApplication;
  let consume: jest.Mock;

  beforeEach(async () => {
    consume = jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [GoogleOidcController],
      providers: [
        { provide: GoogleOidcAuthenticationService, useValue: {} },
        { provide: GoogleOidcProtocolService, useValue: {} },
        {
          provide: GoogleOidcSessionHandoffService,
          useValue: { consume },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('exchanges a handoff without JWT authentication and returns SessionDto with 200', async () => {
    await request(app.getHttpServer())
      .post('/auth/google/oidc/exchange')
      .send({ handoff: 'a'.repeat(43) })
      .expect(200)
      .expect({ accessToken: 'access-token', refreshToken: 'refresh-token' });

    expect(consume).toHaveBeenCalledWith('a'.repeat(43));
  });

  it('preserves global rejection of unrelated request fields', async () => {
    await request(app.getHttpServer())
      .post('/auth/google/oidc/exchange')
      .send({ handoff: 'a'.repeat(43), unexpected: true })
      .expect(400);

    expect(consume).not.toHaveBeenCalled();
  });
});
