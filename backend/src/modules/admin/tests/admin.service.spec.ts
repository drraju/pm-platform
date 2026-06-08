import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { Permission } from '../../users/entities/permission.entity';
import { RolePermission } from '../../users/entities/role-permission.entity';
import { Role } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { AdminService } from '../admin.service';

describe('AdminService', () => {
  let service: AdminService;
  const rolesRepository = {
    findOne: jest.fn(),
  };
  const usersRepository = {
    create: jest.fn((input) => input),
    findOne: jest.fn(),
    save: jest.fn((input) => Promise.resolve({ id: 'user-1', ...input })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    rolesRepository.findOne.mockResolvedValue({ id: 'role-1', name: 'Admin' });
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      roleId: 'role-1',
      status: 'active',
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        { provide: getRepositoryToken(Permission), useValue: {} },
        { provide: getRepositoryToken(RolePermission), useValue: {} },
        { provide: getRepositoryToken(Project), useValue: {} },
        { provide: getRepositoryToken(ProjectMember), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  it('creates users with an assigned role', async () => {
    const result = await service.createUser({
      email: 'new.admin@example.com',
      firstName: 'New',
      lastName: 'Admin',
      password: 'Password123!',
      roleId: 'role-1',
      username: 'new-admin',
    });

    expect(rolesRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'role-1' },
    });
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.admin@example.com',
        passwordHash: expect.any(String),
        roleId: 'role-1',
        status: 'active',
        username: 'new-admin',
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'user-1' }));
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('updates user role assignments', async () => {
    await service.updateUser('user-1', { roleId: 'role-2' });

    expect(rolesRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'role-2' },
    });
    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 'role-2' }),
    );
  });

  it('does not expose password hashes after password reset', async () => {
    const result = await service.resetPassword('user-1', {
      temporaryPassword: 'Temporary123!',
    });

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: expect.any(String) }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });
});
