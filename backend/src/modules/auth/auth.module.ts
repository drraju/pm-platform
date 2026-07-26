import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Role } from '../users/entities/role.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordModule } from './password.module';
import { PasswordResetEmailService } from './password-reset-email.service';
import { PasswordResetService } from './password-reset.service';
import { PasswordUpdateService } from './password-update.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'development-jwt-secret',
      signOptions: { expiresIn: '1h' },
    }),
    TypeOrmModule.forFeature([PasswordResetToken, Role]),
    PasswordModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordResetEmailService,
    PasswordResetService,
    PasswordUpdateService,
  ],
  exports: [AuthService, PasswordResetService, PasswordUpdateService],
})
export class AuthModule {}
