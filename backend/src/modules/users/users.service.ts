import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
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
    const users = await this.usersRepository.find({ relations: { role: true } });
    return users.map((user) => this.toUserResponse(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: true },
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
      .where('user.email = :email', { email })
      .getOne();
  }

  findRoles(): Promise<Role[]> {
    return this.rolesRepository.find({ order: { name: 'ASC' } });
  }

  createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    return this.rolesRepository.save(this.rolesRepository.create(createRoleDto));
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
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
      relations: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      status: user.status,
      role: user.role ?? null,
    };
  }
}
