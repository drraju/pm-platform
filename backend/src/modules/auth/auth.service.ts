import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SessionDto } from './dto/session.dto';
import {
  PasswordChangeAuditContext,
  PasswordUpdateService,
} from './password-update.service';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly passwordUpdateService: PasswordUpdateService,
  ) {}

  async login(loginDto: LoginDto): Promise<SessionDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!['active', 'first_login_pending'].includes(user.status)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.recordLogin(user.id);
    return this.issueSession(user.id, user.email, user.roleId, {
      requiresPasswordChange: user.status === 'first_login_pending',
    });
  }

  getMe(userId: string) {
    return this.usersService.getSessionProfile(userId);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<ChangePasswordResponseDto> {
    return this.passwordUpdateService.changeOwnPassword(
      userId,
      changePasswordDto,
      auditContext,
    );
  }

  private issueSession(
    userId: string,
    email: string,
    roleId: string,
    options: { requiresPasswordChange?: boolean } = {},
  ): SessionDto {
    const payload = { sub: userId, email, roleId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      ...(options.requiresPasswordChange
        ? { requiresPasswordChange: true }
        : {}),
    };
  }
}
