import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserRole,
  userRoleDescriptions,
} from '../../common/enums/user-role.enum';
import { Role } from '../users/entities/role.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { PasswordResetResponseDto } from './dto/password-reset-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionDto } from './dto/session.dto';
import {
  PasswordChangeAuditContext,
  PasswordUpdateService,
} from './password-update.service';
import { PasswordResetService } from './password-reset.service';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly passwordUpdateService: PasswordUpdateService,
    private readonly passwordResetService: PasswordResetService,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async register(registerDto: RegisterDto): Promise<SessionDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwordService.hashPassword(
      registerDto.password,
    );
    const roleId = registerDto.roleId ?? (await this.getDefaultRoleId());
    const user = await this.usersService.create({
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      passwordHash,
      roleId,
      status: 'active',
    });

    return this.issueSession(user.id, user.email, user.roleId);
  }

  async login(loginDto: LoginDto): Promise<SessionDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSession(user.id, user.email, user.roleId);
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

  requestPasswordReset(
    forgotPasswordDto: ForgotPasswordDto,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<PasswordResetResponseDto> {
    return this.passwordResetService.requestPasswordReset(
      forgotPasswordDto,
      auditContext,
    );
  }

  resetPassword(
    resetPasswordDto: ResetPasswordDto,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<PasswordResetResponseDto> {
    return this.passwordResetService.resetPassword(
      resetPasswordDto,
      auditContext,
    );
  }

  private issueSession(
    userId: string,
    email: string,
    roleId: string,
  ): SessionDto {
    const payload = { sub: userId, email, roleId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  private async getDefaultRoleId(): Promise<string> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: UserRole.ProjectManager },
    });
    if (existingRole) {
      return existingRole.id;
    }

    const role = this.rolesRepository.create({
      name: UserRole.ProjectManager,
      description: userRoleDescriptions[UserRole.ProjectManager],
    });
    const savedRole = await this.rolesRepository.save(role).catch(async () => {
      const createdRole = await this.rolesRepository.findOne({
        where: { name: UserRole.ProjectManager },
      });
      if (!createdRole) {
        throw new Error('Unable to create default role');
      }
      return createdRole;
    });
    return savedRole.id;
  }
}
