import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { SUPER_ADMIN_ROLE } from '../authorization/authorization.service';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

export const superAdminUsername = 'admin';
export const defaultSuperAdminPassword = 'Admin123!';

@Injectable()
export class SuperAdminBootstrapService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const role = await this.ensureSuperAdminRole();
    await this.ensureSuperAdminUser(role.id);
  }

  private async ensureSuperAdminRole(): Promise<Role> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: SUPER_ADMIN_ROLE },
    });
    if (existingRole) {
      return existingRole;
    }

    return this.rolesRepository.save(
      this.rolesRepository.create({
        description: 'Unrestricted platform administration role',
        name: SUPER_ADMIN_ROLE,
        status: 'active',
      }),
    );
  }

  private async ensureSuperAdminUser(roleId: string): Promise<void> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ username: superAdminUsername }, { email: this.email }],
    });
    if (existingUser) {
      if (existingUser.roleId !== roleId || existingUser.status !== 'active') {
        existingUser.roleId = roleId;
        existingUser.status = 'active';
        await this.usersRepository.save(existingUser);
      }
      return;
    }

    await this.usersRepository.save(
      this.usersRepository.create({
        email: this.email,
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: await bcrypt.hash(this.password, 10),
        roleId,
        status: 'active',
        username: superAdminUsername,
      }),
    );
  }

  private get email(): string {
    return process.env.SUPER_ADMIN_EMAIL ?? 'admin@example.com';
  }

  private get password(): string {
    return process.env.SUPER_ADMIN_PASSWORD ?? defaultSuperAdminPassword;
  }
}
