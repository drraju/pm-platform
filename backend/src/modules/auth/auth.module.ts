import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordModule } from './password.module';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordUpdateService } from './password-update.service';
import { PmSessionIssuer } from './pm-session-issuer.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { getJwtConfiguration, JWT_CONFIGURATION } from './jwt-configuration';
import {
  GoogleOidcClient,
  GOOGLE_OIDC_CLIENT,
} from './oidc/google-oidc.client';
import {
  getGoogleOidcConfiguration,
  GOOGLE_OIDC_CONFIGURATION,
} from './oidc/google-oidc.configuration';
import { GoogleOidcController } from './oidc/google-oidc.controller';
import { GoogleOidcAuthenticationService } from './oidc/google-oidc-authentication.service';
import { GoogleOidcProtocolService } from './oidc/google-oidc-protocol.service';
import {
  OIDC_RANDOM_SOURCE,
  OidcRandomSource,
} from './oidc/oidc-random.source';
import { OIDC_REDIS_COMMANDS, OidcRedisClient } from './oidc/oidc-redis.client';
import {
  OIDC_TRANSACTION_STORE,
  OidcTransactionStore,
} from './oidc/oidc-transaction.store';
import { GoogleWorkspaceIdentityValidator } from './oidc/google-workspace-identity.validator';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const configuration = getJwtConfiguration();
        return {
          secret: configuration.accessSecret,
          signOptions: {
            algorithm: configuration.algorithm,
            audience: configuration.accessAudience,
            expiresIn: configuration.accessExpiresIn,
            issuer: configuration.issuer,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([PasswordResetToken]),
    PasswordModule,
    UsersModule,
  ],
  controllers: [AuthController, GoogleOidcController],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordResetTokenService,
    PasswordUpdateService,
    PmSessionIssuer,
    GoogleOidcAuthenticationService,
    GoogleOidcClient,
    GoogleOidcProtocolService,
    GoogleWorkspaceIdentityValidator,
    OidcRandomSource,
    OidcRedisClient,
    OidcTransactionStore,
    {
      provide: GOOGLE_OIDC_CLIENT,
      useExisting: GoogleOidcClient,
    },
    {
      provide: GOOGLE_OIDC_CONFIGURATION,
      useFactory: getGoogleOidcConfiguration,
    },
    {
      provide: OIDC_RANDOM_SOURCE,
      useExisting: OidcRandomSource,
    },
    {
      provide: OIDC_REDIS_COMMANDS,
      useExisting: OidcRedisClient,
    },
    {
      provide: OIDC_TRANSACTION_STORE,
      useExisting: OidcTransactionStore,
    },
    {
      provide: JWT_CONFIGURATION,
      useFactory: getJwtConfiguration,
    },
  ],
  exports: [AuthService, PasswordUpdateService],
})
export class AuthModule {}
