import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../common/authz/permissions';
import { ProjectMember } from '../projects/entities/project-member.entity';
import {
  canonicalUserRoles,
  UserRole,
} from '../../common/enums/user-role.enum';
import { AssignableUserResponseDto } from './dto/assignable-user-response.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

export type UserAdministrationActor = {
  email?: string;
  roleId: string;
  userId: string;
};

export type CreateUserPersistenceInput = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roleId: string;
  status?: string;
};

const externalUserRoleNames = new Set<string>([
  UserRole.Customer,
  UserRole.Partner,
]);

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  async create(
    createUserDto: CreateUserPersistenceInput,
    actor?: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    if (actor) {
      await this.ensurePlatformAdmin(actor);
    }
    if (!createUserDto.passwordHash) {
      throw new BadRequestException('Password is required');
    }
    await this.ensureCanonicalRole(createUserDto.roleId);

    const user = this.usersRepository.create({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      passwordHash: createUserDto.passwordHash,
      roleId: createUserDto.roleId,
      status: createUserDto.status ?? 'first_login_pending',
      accountHistory: actor
        ? [this.createHistoryEntry('UserCreated', actor.userId)]
        : [],
    });
    const savedUser = await this.usersRepository.save(user);
    this.recordUserAdministrationAudit('UserCreated', savedUser.id, actor);
    return this.toUserResponse(savedUser);
  }

  async findAll(actor?: UserAdministrationActor): Promise<UserResponseDto[]> {
    if (actor) {
      await this.ensurePlatformAdmin(actor);
    }
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC', email: 'ASC' },
      relations: { role: { permissions: true } },
    });
    return users.map((user) => this.toUserResponse(user));
  }

  async findAssignableUsers(
    actor?: UserAdministrationActor,
    projectId?: string,
  ): Promise<AssignableUserResponseDto[]> {
    if (
      !actor ||
      (await this.authorizationPolicyService.isExternalActor(actor))
    ) {
      throw new ForbiddenException('Assignable user access is restricted');
    }

    let scopedUserIds: string[] | undefined;
    if (projectId) {
      const canManageProject =
        await this.authorizationPolicyService.canManageProject(
          projectId,
          actor,
        );
      if (!canManageProject) {
        if (
          !(await this.authorizationPolicyService.canViewProject(
            projectId,
            actor,
          ))
        ) {
          throw new ForbiddenException('Assignable user access is restricted');
        }
        const memberships = await this.projectMembersRepository.find({
          select: { userId: true },
          where: { projectId },
        });
        scopedUserIds = memberships.map((membership) => membership.userId);
        if (scopedUserIds.length === 0) {
          return [];
        }
      }
    } else if (
      !(await this.authorizationPolicyService.hasAnyPermission(actor, [
        PermissionKey.ProjectCreate,
        PermissionKey.ProjectTeamManage,
        PermissionKey.RaidCreate,
        PermissionKey.TaskReassign,
        PermissionKey.UserManage,
      ]))
    ) {
      throw new ForbiddenException('Assignable user access is restricted');
    }

    const users = await this.usersRepository.find({
      order: { firstName: 'ASC', lastName: 'ASC', email: 'ASC' },
      relations: { role: true },
      where: {
        ...(scopedUserIds ? { id: In(scopedUserIds) } : {}),
        status: 'active',
      },
    });
    return users
      .filter((user) => !externalUserRoleNames.has(user.role?.name ?? ''))
      .map((user) => this.toAssignableUserResponse(user));
  }

  async findOne(
    id: string,
    actor?: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    if (actor) {
      await this.ensurePlatformAdmin(actor);
    }
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

  findAuthenticationUserById(userId: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  findTokenValidationUser(userId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      select: {
        email: true,
        id: true,
        passwordChangedAt: true,
        roleId: true,
        status: true,
      },
      where: { id: userId },
    });
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    passwordChangedAt = new Date(),
    status?: string,
  ): Promise<void> {
    const result = await this.usersRepository.update(
      { id: userId },
      {
        passwordChangedAt,
        passwordHash,
        ...(status ? { status } : {}),
      },
    );

    if (!result.affected) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  async recordLogin(userId: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { lastLoginAt: new Date() },
    );
  }

  async findRoles(actor?: UserAdministrationActor): Promise<RoleResponseDto[]> {
    if (actor) {
      await this.ensurePlatformAdmin(actor);
    }
    const roles = await this.rolesRepository.find({
      order: { name: 'ASC' },
      relations: { permissions: true },
      where: { name: In([...canonicalUserRoles]) },
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

  async createRole(
    createRoleDto: CreateRoleDto,
    actor: UserAdministrationActor,
  ): Promise<RoleResponseDto> {
    if (!(await this.authorizationPolicyService.canManageRoles(actor))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const role = await this.rolesRepository.save(
      this.rolesRepository.create(createRoleDto),
    );
    return this.toRoleResponse({ ...role, permissions: [] });
  }

  async updateRolePermissions(
    roleId: string,
    updateRolePermissionsDto: UpdateRolePermissionsDto,
    actor: UserAdministrationActor,
  ): Promise<RoleResponseDto> {
    if (
      !(await this.authorizationPolicyService.canManageRolePermissions(actor))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

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
    actor?: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    if (actor) {
      await this.ensurePlatformAdmin(actor);
    }
    if (actor?.userId === id && updateUserDto.roleId) {
      throw new ForbiddenException('Users cannot modify their own role');
    }
    if (actor?.userId === id && updateUserDto.status) {
      throw new ForbiddenException('Users cannot modify their own status');
    }
    const user = await this.findUserEntity(id);
    const roleChanged =
      Boolean(updateUserDto.roleId) && updateUserDto.roleId !== user.roleId;
    let updatedRole: Role | undefined;
    if (updateUserDto.roleId) {
      updatedRole = await this.ensureCanonicalRole(updateUserDto.roleId);
    }
    Object.assign(user, updateUserDto);
    if (updatedRole) {
      user.role = updatedRole;
    }
    user.accountHistory = [
      ...(user.accountHistory ?? []),
      this.createHistoryEntry(
        roleChanged ? 'RoleChanged' : 'UserUpdated',
        actor?.userId,
      ),
    ];
    const savedUser = await this.usersRepository.save(user);
    this.recordUserAdministrationAudit(
      roleChanged ? 'RoleChanged' : 'UserUpdated',
      id,
      actor,
    );
    return this.findOne(savedUser.id);
  }

  async enable(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    if (actor.userId === id) {
      throw new ForbiddenException('Users cannot enable themselves');
    }
    return this.updateLifecycleStatus(id, 'active', 'UserEnabled', actor);
  }

  async disable(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    if (actor.userId === id) {
      throw new ForbiddenException('Users cannot disable themselves');
    }
    return this.updateLifecycleStatus(id, 'disabled', 'UserDisabled', actor);
  }

  async remove(id: string, actor?: UserAdministrationActor): Promise<void> {
    if (!actor) {
      throw new ForbiddenException('User deletion is not supported');
    }
    await this.disable(id, actor);
  }

  async recordAdminPasswordReset(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    if (actor.userId === id) {
      throw new ForbiddenException(
        'Users cannot reset their own password here',
      );
    }
    return this.updateLifecycleStatus(
      id,
      'first_login_pending',
      'PasswordReset',
      actor,
    );
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
      accountHistory: user.accountHistory ?? [],
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
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

  private async updateLifecycleStatus(
    id: string,
    status: string,
    action: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    const user = await this.findUserEntity(id);
    user.status = status;
    user.accountHistory = [
      ...(user.accountHistory ?? []),
      this.createHistoryEntry(action, actor.userId),
    ];
    const savedUser = await this.usersRepository.save(user);
    this.recordUserAdministrationAudit(action, id, actor);
    return this.toUserResponse(savedUser);
  }

  private async ensureCanonicalRole(roleId: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role || !canonicalUserRoles.includes(role.name as UserRole)) {
      throw new BadRequestException(
        'Role is not supported for user administration',
      );
    }
    return role;
  }

  async ensurePlatformAdmin(actor: UserAdministrationActor): Promise<void> {
    const role = await this.rolesRepository.findOne({
      where: { id: actor.roleId, name: UserRole.PlatformAdmin },
    });
    if (!role) {
      throw new ForbiddenException('Platform administrator access is required');
    }
  }

  private createHistoryEntry(action: string, administratorId = 'system') {
    return {
      action,
      administratorId,
      timestamp: new Date().toISOString(),
    };
  }

  private recordUserAdministrationAudit(
    action: string,
    userId: string,
    actor?: UserAdministrationActor,
  ) {
    this.logger.log({
      action,
      administratorId: actor?.userId ?? 'system',
      event: 'UserAdministrationAction',
      timestamp: new Date().toISOString(),
      userId,
    });
  }
}
