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
import { isUserIdentityRoleAssignmentAllowed } from '../../common/authz/user-identity-role-policy';
import { UserIdentityType } from '../../common/enums/user-identity-type.enum';
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
import { UserRoleAssignment } from './entities/user-role-assignment.entity';
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
  passwordHash: string | null;
  roleId: string;
  roleIds?: string[];
  localOnly?: boolean;
  status?: string;
};

export type CreateServiceAccountPersistenceInput = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
};

export type UpdateServiceAccountMetadataInput = {
  email?: string;
  firstName?: string;
  lastName?: string;
};

const externalUserRoleNames = new Set<string>([
  UserRole.Customer,
  UserRole.Partner,
]);

const rolePrivilegeOrder = [
  UserRole.PlatformAdmin,
  UserRole.Admin,
  UserRole.PortfolioManager,
  UserRole.ProgramManager,
  UserRole.ProjectManager,
  UserRole.CustomerSuccessManager,
  UserRole.Executive,
  UserRole.Sales,
  UserRole.TeamMember,
  UserRole.Partner,
  UserRole.Customer,
  UserRole.ServiceUser,
];

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
    @InjectRepository(UserRoleAssignment)
    private readonly userRolesRepository?: Repository<UserRoleAssignment>,
  ) {}

  async create(
    createUserDto: CreateUserPersistenceInput,
    actor?: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    if (actor) {
      await this.ensurePlatformAdmin(actor);
    }
    const localOnly = createUserDto.localOnly ?? Boolean(createUserDto.passwordHash);
    if (!createUserDto.passwordHash && localOnly) {
      throw new BadRequestException('Password is required');
    }
    const roles = await this.resolveRequestedRoles(
      createUserDto.roleIds?.length
        ? createUserDto.roleIds
        : [createUserDto.roleId],
    );
    for (const role of roles) {
      this.ensureIdentityRoleAssignment(UserIdentityType.Human, role);
    }
    const primaryRole = this.primaryRole(roles);

    const user = this.usersRepository.create({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      passwordHash: createUserDto.passwordHash,
      identityType: UserIdentityType.Human,
      localOnly,
      role: primaryRole,
      roleId: primaryRole.id,
      status:
        createUserDto.status ??
        (localOnly ? 'first_login_pending' : 'active'),
      accountHistory: actor
        ? [this.createHistoryEntry('UserCreated', actor.userId)]
        : [],
    });
    const savedUser = await this.usersRepository.save(user);
    await this.replaceRoleAssignments(savedUser.id, roles);
    this.recordUserAdministrationAudit('UserCreated', savedUser.id, actor);
    return this.toUserResponse(savedUser, roles);
  }

  async createServiceAccount(
    input: CreateServiceAccountPersistenceInput,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    if (!input.passwordHash) {
      throw new BadRequestException('Password is required');
    }

    const role = await this.findCanonicalRoleByName(UserRole.ServiceUser);
    this.ensureIdentityRoleAssignment(UserIdentityType.Service, role);
    const user = this.usersRepository.create({
      accountHistory: [
        this.createHistoryEntry('ServiceAccountCreated', actor.userId),
      ],
      email: input.email,
      firstName: input.firstName,
      identityType: UserIdentityType.Service,
      lastName: input.lastName,
      passwordChangedAt: new Date(),
      passwordHash: input.passwordHash,
      role,
      roleId: role.id,
      localOnly: true,
      status: 'disabled',
    });
    const savedUser = await this.usersRepository.save(user);
    await this.replaceRoleAssignments(savedUser.id, [role]);
    this.recordServiceAccountAdministrationAudit(
      'ServiceAccountCreated',
      savedUser.id,
      actor,
    );
    return this.toUserResponse(savedUser, [role]);
  }

  async findServiceAccounts(
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto[]> {
    await this.ensurePlatformAdmin(actor);
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC', email: 'ASC' },
      relations: { role: { permissions: true } },
      where: { identityType: UserIdentityType.Service },
    });
    users.forEach((user) => this.ensureCurrentIdentityRoleAssignment(user));
    return users.map((user) => this.toUserResponse(user));
  }

  async findServiceAccount(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    return this.toUserResponse(await this.findServiceAccountEntity(id));
  }

  async updateServiceAccountMetadata(
    id: string,
    input: UpdateServiceAccountMetadataInput,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    const user = await this.findServiceAccountEntity(id);
    if (input.email !== undefined) {
      user.email = input.email;
    }
    if (input.firstName !== undefined) {
      user.firstName = input.firstName;
    }
    if (input.lastName !== undefined) {
      user.lastName = input.lastName;
    }
    user.accountHistory = [
      ...(user.accountHistory ?? []),
      this.createHistoryEntry('ServiceAccountMetadataUpdated', actor.userId),
    ];
    const savedUser = await this.usersRepository.save(user);
    this.recordServiceAccountAdministrationAudit(
      'ServiceAccountMetadataUpdated',
      id,
      actor,
    );
    return this.toUserResponse(savedUser);
  }

  async findServiceAccountAuthenticationUser(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<User> {
    await this.ensurePlatformAdmin(actor);
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id })
      .getOne();
    if (!user || user.identityType !== UserIdentityType.Service) {
      throw new NotFoundException(`Service account ${id} not found`);
    }
    this.ensureCurrentIdentityRoleAssignment(user);
    return user;
  }

  async persistServiceAccountCredentialRotation(
    id: string,
    passwordHash: string,
    passwordChangedAt: Date,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    const user = await this.findServiceAccountEntity(id);
    user.passwordHash = passwordHash;
    user.passwordChangedAt = passwordChangedAt;
    user.accountHistory = [
      ...(user.accountHistory ?? []),
      this.createHistoryEntry('ServiceAccountCredentialsRotated', actor.userId),
    ];
    const savedUser = await this.usersRepository.save(user);
    this.recordServiceAccountAdministrationAudit(
      'ServiceAccountCredentialsRotated',
      id,
      actor,
    );
    return this.toUserResponse(savedUser);
  }

  async enableServiceAccount(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    return this.updateServiceAccountLifecycleStatus(
      id,
      'active',
      'ServiceAccountEnabled',
      actor,
      false,
    );
  }

  async disableServiceAccount(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    return this.updateServiceAccountLifecycleStatus(
      id,
      'disabled',
      'ServiceAccountDisabled',
      actor,
      true,
    );
  }

  async findAll(actor?: UserAdministrationActor): Promise<UserResponseDto[]> {
    if (actor) {
      await this.ensurePlatformAdmin(actor);
    }
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC', email: 'ASC' },
      relations: { role: { permissions: true } },
    });
    const rolesByUserId = await this.rolesForUsers(users);
    return users.map((user) =>
      this.toUserResponse(user, rolesByUserId.get(user.id) ?? []),
    );
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
        identityType: true,
        passwordChangedAt: true,
        role: { name: true },
        roleId: true,
        status: true,
      },
      relations: { role: true },
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
    if (
      actor?.userId === id &&
      (updateUserDto.roleId || updateUserDto.roleIds?.length)
    ) {
      throw new ForbiddenException('Users cannot modify their own role');
    }
    if (actor?.userId === id && updateUserDto.status) {
      throw new ForbiddenException('Users cannot modify their own status');
    }
    const user = await this.findUserEntity(id);
    if (
      user.identityType === UserIdentityType.Service &&
      updateUserDto.status !== undefined
    ) {
      throw new BadRequestException(
        'Service account lifecycle must use the dedicated administration API',
      );
    }
    const requestedRoleIds = updateUserDto.roleIds?.length
      ? updateUserDto.roleIds
      : updateUserDto.roleId
        ? [updateUserDto.roleId]
        : [];
    const roleChanged =
      requestedRoleIds.length > 0 &&
      (requestedRoleIds.length !== 1 || requestedRoleIds[0] !== user.roleId);
    let updatedRoles: Role[] = [];
    if (requestedRoleIds.length > 0) {
      updatedRoles = await this.resolveRequestedRoles(requestedRoleIds);
      for (const role of updatedRoles) {
        this.ensureIdentityRoleAssignment(user.identityType, role);
      }
      const primaryRole = this.primaryRole(updatedRoles);
      user.role = primaryRole;
      user.roleId = primaryRole.id;
    } else {
      this.ensureCurrentIdentityRoleAssignment(user);
    }
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.firstName !== undefined) {
      user.firstName = updateUserDto.firstName;
    }
    if (updateUserDto.lastName !== undefined) {
      user.lastName = updateUserDto.lastName;
    }
    if (updateUserDto.status !== undefined) {
      user.status = updateUserDto.status;
    }
    const auditAction =
      user.identityType === UserIdentityType.Service
        ? 'ServiceAccountMetadataUpdated'
        : roleChanged
          ? 'RoleChanged'
          : 'UserUpdated';
    user.accountHistory = [
      ...(user.accountHistory ?? []),
      this.createHistoryEntry(auditAction, actor?.userId),
    ];
    const savedUser = await this.usersRepository.save(user);
    if (updatedRoles.length > 0) {
      await this.replaceRoleAssignments(savedUser.id, updatedRoles);
    }
    if (user.identityType === UserIdentityType.Service && actor) {
      this.recordServiceAccountAdministrationAudit(auditAction, id, actor);
    } else {
      this.recordUserAdministrationAudit(auditAction, id, actor);
    }
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
    await this.ensureHumanUserAdministrationTarget(id, actor);
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
    await this.ensureHumanUserAdministrationTarget(id, actor);
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
    await this.ensureHumanUserAdministrationTarget(id, actor);
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

  async ensureHumanUserAdministrationTarget(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<void> {
    await this.ensurePlatformAdmin(actor);
    const user = await this.findUserEntity(id);
    if (user.identityType === UserIdentityType.Service) {
      throw new BadRequestException(
        'Service account lifecycle must use the dedicated administration API',
      );
    }
    this.ensureCurrentIdentityRoleAssignment(user);
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

    const rolesByUserId = await this.rolesForUsers([user]);
    const roles = rolesByUserId.get(user.id) ?? [];
    const permissions = new Map<string, PermissionResponseDto>();
    for (const role of roles) {
      for (const permission of this.toRoleResponse(role).permissions) {
        permissions.set(permission.key, permission);
      }
    }
    return {
      user: this.toUserResponse(user, roles),
      roles: roles.map((role) => this.toRoleResponse(role)),
      permissions: [...permissions.values()].sort((left, right) =>
        left.key.localeCompare(right.key),
      ),
    };
  }

  private toUserResponse(user: User, assignedRoles?: Role[]): UserResponseDto {
    const roles = assignedRoles ?? (user.role ? [user.role] : []);
    const primary = roles.length > 0 ? this.primaryRole(roles) : null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      ...(user.identityType === UserIdentityType.Service
        ? { identityType: UserIdentityType.Service }
        : {}),
      lastName: user.lastName ?? '',
      roleId: user.roleId,
      status: user.status,
      accountHistory: user.accountHistory ?? [],
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
      role: primary ? this.toRoleResponse(primary) : null,
      roles: roles.map((role) => this.toRoleResponse(role)),
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
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
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

  private async updateServiceAccountLifecycleStatus(
    id: string,
    status: 'active' | 'disabled',
    action: string,
    actor: UserAdministrationActor,
    invalidateTokens: boolean,
  ): Promise<UserResponseDto> {
    await this.ensurePlatformAdmin(actor);
    const user = await this.findServiceAccountEntity(id);
    user.status = status;
    if (invalidateTokens) {
      user.passwordChangedAt = new Date();
    }
    user.accountHistory = [
      ...(user.accountHistory ?? []),
      this.createHistoryEntry(action, actor.userId),
    ];
    const savedUser = await this.usersRepository.save(user);
    this.recordServiceAccountAdministrationAudit(action, id, actor);
    return this.toUserResponse(savedUser);
  }

  private async findServiceAccountEntity(id: string): Promise<User> {
    const user = await this.findUserEntity(id);
    if (user.identityType !== UserIdentityType.Service) {
      throw new NotFoundException(`Service account ${id} not found`);
    }
    this.ensureCurrentIdentityRoleAssignment(user);
    return user;
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

  private async findCanonicalRoleByName(roleName: UserRole): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { name: roleName },
    });
    if (!role || !canonicalUserRoles.includes(role.name as UserRole)) {
      throw new BadRequestException(
        'Role is not supported for user administration',
      );
    }
    return role;
  }

  private ensureIdentityRoleAssignment(
    identityType: UserIdentityType,
    role: Pick<Role, 'name'> | null | undefined,
  ): void {
    if (!isUserIdentityRoleAssignmentAllowed(identityType, role?.name)) {
      throw new BadRequestException(
        'User identity type is incompatible with the selected role',
      );
    }
  }

  private ensureCurrentIdentityRoleAssignment(user: User): void {
    this.ensureIdentityRoleAssignment(user.identityType, user.role);
  }

  async ensurePlatformAdmin(actor: UserAdministrationActor): Promise<void> {
    const policy = this.authorizationPolicyService;
    if (
      typeof policy?.isPlatformAdministrator === 'function' &&
      (await policy.isPlatformAdministrator(actor))
    ) {
      return;
    }
    const role = await this.rolesRepository.findOne({
      where: { id: actor.roleId, name: UserRole.PlatformAdmin },
    });
    if (!role) {
      throw new ForbiddenException('Platform administrator access is required');
    }
  }

  private primaryRole(roles: Role[]): Role {
    return [...roles].sort(
      (left, right) =>
        this.rolePrivilege(left.name) - this.rolePrivilege(right.name),
    )[0];
  }

  private rolePrivilege(roleName: string): number {
    const index = rolePrivilegeOrder.indexOf(roleName as UserRole);
    return index === -1 ? rolePrivilegeOrder.length : index;
  }

  private async resolveRequestedRoles(roleIds: string[]): Promise<Role[]> {
    const uniqueRoleIds = [...new Set(roleIds.filter(Boolean))];
    if (uniqueRoleIds.length === 0) {
      throw new BadRequestException('At least one role is required');
    }
    const roles: Role[] = [];
    for (const roleId of uniqueRoleIds) {
      roles.push(await this.ensureCanonicalRole(roleId));
    }
    return roles;
  }

  private async replaceRoleAssignments(
    userId: string,
    roles: Role[],
  ): Promise<void> {
    if (!this.userRolesRepository) {
      return;
    }
    const userRolesRepository = this.userRolesRepository;
    await userRolesRepository.delete({ userId });
    if (roles.length === 0) {
      return;
    }
    await userRolesRepository.save(
      roles.map((role) =>
        userRolesRepository.create({ roleId: role.id, userId }),
      ),
    );
  }

  private async rolesForUsers(users: User[]): Promise<Map<string, Role[]>> {
    const rolesByUserId = new Map<string, Role[]>();
    if (!this.userRolesRepository) {
      for (const user of users) {
        rolesByUserId.set(user.id, user.role ? [user.role] : []);
      }
      return rolesByUserId;
    }
    const userRolesRepository = this.userRolesRepository;
    if (users.length === 0) {
      return rolesByUserId;
    }
    const assignments = await userRolesRepository.find({
      where: { userId: In(users.map((user) => user.id)) },
    });
    const roleIds = [...new Set(assignments.map((assignment) => assignment.roleId))];
    const roles = roleIds.length
      ? await this.rolesRepository.find({
          relations: { permissions: true },
          where: { id: In(roleIds) },
        })
      : [];
    const rolesById = new Map(roles.map((role) => [role.id, role]));
    for (const user of users) {
      const assigned = assignments
        .filter((assignment) => assignment.userId === user.id)
        .map((assignment) => rolesById.get(assignment.roleId))
        .filter((role): role is Role => Boolean(role));
      rolesByUserId.set(
        user.id,
        assigned.length > 0 ? assigned : user.role ? [user.role] : [],
      );
    }
    return rolesByUserId;
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

  private recordServiceAccountAdministrationAudit(
    action: string,
    userId: string,
    actor: UserAdministrationActor,
  ) {
    this.logger.log({
      action,
      administratorId: actor.userId,
      event: 'ServiceAccountAdministrationAction',
      timestamp: new Date().toISOString(),
      userId,
    });
  }
}
