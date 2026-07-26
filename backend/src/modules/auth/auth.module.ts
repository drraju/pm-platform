import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Role } from '../users/entities/role.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordPolicyService } from './password-policy.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'development-jwt-secret',
      signOptions: { expiresIn: '1h' },
    }),
    TypeOrmModule.forFeature([Role]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordPolicyService, PasswordService],
  exports: [AuthService],
})
export class AuthModule {}
