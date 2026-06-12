import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { AssignableUserResponseDto } from './dto/assignable-user-response.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

type CreateUserInput = CreateUserDto & {
  passwordHash?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(createUserDto: CreateUserInput): Promise<UserResponseDto> {
    const passwordHash =
      createUserDto.passwordHash ??
      (createUserDto.password
        ? await bcrypt.hash(createUserDto.password, 10)
        : undefined);

    if (!passwordHash) {
      throw new BadRequestException('Password is required');
    }

    const user = this.usersRepository.create({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      passwordHash,
      roleId: createUserDto.roleId,
      status: createUserDto.status ?? 'active',
    });

    return this.toUserResponse(await this.usersRepository.save(user));
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      relations: { role: { permissions: true } },
    });
    return users.map((user) => this.toUserResponse(user));
  }

  async findAssignableUsers(): Promise<AssignableUserResponseDto[]> {
    const users = await this.usersRepository.find({
      order: { firstName: 'ASC', lastName: 'ASC', email: 'ASC' },
      relations: { role: true },
      where: { status: 'active' },
    });
    return users.map((user) => this.toAssignableUserResponse(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: { permissions: true } },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.toUserResponse(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.rolesRepository.find({
      order: { name: 'ASC' },
      relations: { permissions: true },
    });
    return roles.map((role) => this.toRoleResponse(role));
  }

  async findPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsRepository.find({
      order: { key: 'ASC' },
    });
    return permissions.map((permission) =>
      this.toPermissionResponse(permission),
    );
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.save(
      this.rolesRepository.create(createRoleDto),
    );
    return this.toRoleResponse({ ...role, permissions: [] });
  }

  async updateRolePermissions(
    roleId: string,
    updateRolePermissionsDto: UpdateRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const permissionKeys = updateRolePermissionsDto.permissionKeys;
    const permissions = permissionKeys.length
      ? await this.permissionsRepository.find({
          where: { key: In(permissionKeys) },
        })
      : [];
    const foundKeys = new Set(permissions.map((permission) => permission.key));
    const missingKeys = permissionKeys.filter((key) => !foundKeys.has(key));
    if (missingKeys.length > 0) {
      throw new BadRequestException(
        `Unknown permissions: ${missingKeys.join(', ')}`,
      );
    }

    role.permissions = permissions;
    return this.toRoleResponse(await this.rolesRepository.save(role));
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findUserEntity(id);
    Object.assign(user, updateUserDto);
    return this.toUserResponse(await this.usersRepository.save(user));
  }

  async remove(id: string): Promise<void> {
    const user = await this.findUserEntity(id);
    await this.usersRepository.remove(user);
  }

  private async findUserEntity(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: { permissions: true } },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async getSessionProfile(userId: string): Promise<{
    user: UserResponseDto;
    roles: RoleResponseDto[];
    permissions: PermissionResponseDto[];
  }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { role: { permissions: true } },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const role = user.role ? this.toRoleResponse(user.role) : null;
    return {
      user: this.toUserResponse(user),
      roles: role ? [role] : [],
      permissions: role?.permissions ?? [],
    };
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      role: user.role ? this.toRoleResponse(user.role) : null,
    };
  }

  private toAssignableUserResponse(user: User): AssignableUserResponseDto {
    const displayName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: displayName || user.email,
      role: user.role?.name ?? null,
    };
  }

  private toRoleResponse(role: Role): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      permissions: (role.permissions ?? [])
        .map((permission) => this.toPermissionResponse(permission))
        .sort((left, right) => left.key.localeCompare(right.key)),
    };
  }

  private toPermissionResponse(permission: Permission): PermissionResponseDto {
    return {
      id: permission.id,
      key: permission.key,
      description: permission.description ?? null,
    };
  }
}
