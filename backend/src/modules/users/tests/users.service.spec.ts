import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository<User>;

  beforeEach(async () => {
    usersRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: 'user-1', ...input })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('does not return passwordHash when creating users', async () => {
    const result = await service.create({
      email: 'user@example.com',
      firstName: 'Ava',
      lastName: 'Patel',
      passwordHash: 'hashed-password',
      roleId: 'role-1',
    });

    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Ava',
      lastName: 'Patel',
      role: null,
      roleId: 'role-1',
      status: 'active',
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('does not return passwordHash when listing users', async () => {
    usersRepository.find?.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Ava',
        lastName: 'Patel',
        passwordHash: 'hashed-password',
        roleId: 'role-1',
        status: 'active',
      },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Ava',
        lastName: 'Patel',
        role: null,
        roleId: 'role-1',
        status: 'active',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });
});
