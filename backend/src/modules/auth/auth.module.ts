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
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordResetTokenService,
    PasswordUpdateService,
    PmSessionIssuer,
    {
      provide: JWT_CONFIGURATION,
      useFactory: getJwtConfiguration,
    },
  ],
  exports: [AuthService, PasswordUpdateService],
})
export class AuthModule {}
