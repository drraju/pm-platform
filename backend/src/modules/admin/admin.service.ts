import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Permission } from '../users/entities/permission.entity';
import { RolePermission } from '../users/entities/role-permission.entity';
import { Role } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';
import {
  AdminCreateUserDto,
  AdminPermissionDto,
  AdminProjectMembershipDto,
  AdminResetPasswordDto,
  AdminRoleDto,
  AdminRoleMatrixDto,
  AdminUpdateUserDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionsRepository: Repository<RolePermission>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
  ) {}

  async getDashboard() {
    const [users, roles, permissions, memberships] = await Promise.all([
      this.usersRepository.count(),
      this.rolesRepository.count(),
      this.permissionsRepository.count(),
      this.projectMembersRepository.count(),
    ]);

    return {
      sections: [
        'User Management',
        'Role Management',
        'Permission Management',
        'Role-Permission Matrix',
        'Project Membership Management',
        'Audit Logs',
      ],
      totals: { memberships, permissions, roles, users },
    };
  }

  async findUsers() {
    return this.usersRepository.find({
      order: { email: 'ASC' },
      relations: { role: true },
    });
  }

  async createUser(dto: AdminCreateUserDto) {
    await this.ensureRoleExists(dto.roleId);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.usersRepository.save(
      this.usersRepository.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        roleId: dto.roleId,
        status: dto.status ?? 'active',
      }),
    );
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.findUserEntity(id);
    if (dto.roleId) {
      await this.ensureRoleExists(dto.roleId);
    }

    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async disableUser(id: string) {
    return this.updateUser(id, { status: 'disabled' });
  }

  async resetPassword(id: string, dto: AdminResetPasswordDto) {
    const user = await this.findUserEntity(id);
    user.passwordHash = await bcrypt.hash(dto.temporaryPassword, 10);
    return this.usersRepository.save(user);
  }

  findRoles() {
    return this.rolesRepository.find({
      order: { name: 'ASC' },
      relations: { permissions: true },
    });
  }

  createRole(dto: AdminRoleDto) {
    return this.rolesRepository.save(
      this.rolesRepository.create({
        description: dto.description,
        name: dto.name,
        status: dto.status ?? 'active',
      }),
    );
  }

  async updateRole(id: string, dto: AdminRoleDto) {
    const role = await this.findRoleEntity(id);
    Object.assign(role, dto);
    return this.rolesRepository.save(role);
  }

  async cloneRole(id: string) {
    const role = await this.rolesRepository.findOne({
      relations: { permissions: true },
      where: { id },
    });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    const clonedRole = await this.rolesRepository.save(
      this.rolesRepository.create({
        description: role.description,
        name: `${role.name} Copy`,
        status: 'active',
      }),
    );

    await this.replaceRolePermissions(
      clonedRole.id,
      (role.permissions ?? []).map((permission) => permission.id),
    );

    return this.rolesRepository.findOne({
      relations: { permissions: true },
      where: { id: clonedRole.id },
    });
  }

  findPermissions() {
    return this.permissionsRepository.find({
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  createPermission(dto: AdminPermissionDto) {
    return this.permissionsRepository.save(
      this.permissionsRepository.create({
        category: dto.category ?? 'Administration',
        description: dto.description,
        key: dto.key,
      }),
    );
  }

  async getRoleMatrix() {
    const [roles, permissions] = await Promise.all([
      this.rolesRepository.find({
        order: { name: 'ASC' },
        relations: { permissions: true },
      }),
      this.permissionsRepository.find({
        order: { category: 'ASC', key: 'ASC' },
      }),
    ]);

    return { permissions, roles };
  }

  async updateRoleMatrix(dto: AdminRoleMatrixDto) {
    for (const assignment of dto.assignments) {
      await this.replaceRolePermissions(
        assignment.roleId,
        assignment.permissionIds,
      );
    }

    return this.getRoleMatrix();
  }

  async findProjectMemberships() {
    return this.projectMembersRepository.find({
      order: { createdAt: 'ASC' },
      relations: { project: true, user: true },
    });
  }

  async upsertProjectMembership(dto: AdminProjectMembershipDto) {
    await this.ensureProjectExists(dto.projectId);
    await this.findUserEntity(dto.userId);

    const existing = await this.projectMembersRepository.findOne({
      where: { projectId: dto.projectId, userId: dto.userId },
    });

    if (existing) {
      existing.role = dto.role;
      existing.visibilityLevel = dto.visibilityLevel;
      return this.projectMembersRepository.save(existing);
    }

    return this.projectMembersRepository.save(
      this.projectMembersRepository.create(dto),
    );
  }

  async removeProjectMembership(projectId: string, userId: string) {
    const membership = await this.projectMembersRepository.findOne({
      where: { projectId, userId },
    });
    if (!membership) {
      throw new NotFoundException('Project membership not found');
    }

    await this.projectMembersRepository.remove(membership);
  }

  private async replaceRolePermissions(
    roleId: string,
    permissionIds: string[],
  ) {
    await this.ensureRoleExists(roleId);
    const permissions = await this.permissionsRepository.find({
      where: { id: In(permissionIds) },
    });
    if (permissions.length !== permissionIds.length) {
      throw new ConflictException('One or more permissions do not exist');
    }

    await this.rolePermissionsRepository.delete({ roleId });
    await this.rolePermissionsRepository.save(
      permissions.map((permission) =>
        this.rolePermissionsRepository.create({
          createdAt: new Date(),
          permissionId: permission.id,
          roleId,
        }),
      ),
    );
  }

  private async findUserEntity(id: string) {
    const user = await this.usersRepository.findOne({
      relations: { role: true },
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  private async findRoleEntity(id: string) {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    return role;
  }

  private async ensureRoleExists(id: string) {
    await this.findRoleEntity(id);
  }

  private async ensureProjectExists(id: string) {
    const project = await this.projectsRepository.findOne({
      select: { id: true },
      where: { id },
    });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
  }
}
