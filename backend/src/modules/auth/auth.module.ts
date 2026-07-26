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
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'development-jwt-secret',
      signOptions: { expiresIn: '1h' },
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
  ],
  exports: [AuthService, PasswordUpdateService],
})
export class AuthModule {}
