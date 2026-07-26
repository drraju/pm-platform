import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
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
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionDto } from './dto/session.dto';
import { PasswordService } from './password.service';

export type PasswordChangeAuditContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
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
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    this.passwordService.validateNewPassword(changePasswordDto.newPassword);

    const user = await this.usersService.findAuthenticationUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Unable to change password');
    }

    const currentPasswordMatches = await this.passwordService.verifyPassword(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Unable to change password');
    }

    const newPasswordMatchesCurrent = await this.passwordService.verifyPassword(
      changePasswordDto.newPassword,
      user.passwordHash,
    );
    if (newPasswordMatchesCurrent) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }

    const passwordHash = await this.passwordService.hashPassword(
      changePasswordDto.newPassword,
    );
    await this.usersService.updatePassword(userId, passwordHash);
    this.recordPasswordChangeAudit(userId, auditContext);

    return {
      success: true,
      message: 'Password changed successfully. Please sign in again.',
      requiresLogin: true,
    };
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

  private recordPasswordChangeAudit(
    userId: string,
    auditContext: PasswordChangeAuditContext,
  ) {
    this.logger.log({
      event: 'PasswordChanged',
      ipAddress: auditContext.ipAddress,
      timestamp: new Date().toISOString(),
      userAgent: auditContext.userAgent,
      userId,
    });
  }
}
