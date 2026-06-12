import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../users/entities/role.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionDto } from './dto/session.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async register(registerDto: RegisterDto): Promise<SessionDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
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

    const passwordMatches = await bcrypt.compare(
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
      where: { name: 'Project Manager' },
    });
    if (existingRole) {
      return existingRole.id;
    }

    const role = this.rolesRepository.create({
      name: 'Project Manager',
      description: 'Default project delivery role',
    });
    const savedRole = await this.rolesRepository.save(role).catch(async () => {
      const createdRole = await this.rolesRepository.findOne({
        where: { name: 'Project Manager' },
      });
      if (!createdRole) {
        throw new Error('Unable to create default role');
      }
      return createdRole;
    });
    return savedRole.id;
  }
}
