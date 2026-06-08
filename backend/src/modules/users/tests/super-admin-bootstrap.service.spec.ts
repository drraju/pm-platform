import { SUPER_ADMIN_ROLE } from '../../authorization/authorization.service';
import {
  defaultSuperAdminPassword,
  SuperAdminBootstrapService,
  superAdminUsername,
} from '../super-admin-bootstrap.service';

describe('SuperAdminBootstrapService', () => {
  const rolesRepository = {
    create: jest.fn((input) => input),
    findOne: jest.fn(),
    save: jest.fn((input) => Promise.resolve({ id: 'role-1', ...input })),
  };
  const usersRepository = {
    create: jest.fn((input) => input),
    findOne: jest.fn(),
    save: jest.fn((input) => Promise.resolve({ id: 'user-1', ...input })),
  };

  let service: SuperAdminBootstrapService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPER_ADMIN_EMAIL;
    delete process.env.SUPER_ADMIN_PASSWORD;
    service = new SuperAdminBootstrapService(
      rolesRepository as never,
      usersRepository as never,
    );
  });

  it('creates the unrestricted role and bootstrap admin user when missing', async () => {
    rolesRepository.findOne.mockResolvedValue(null);
    usersRepository.findOne.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(rolesRepository.create).toHaveBeenCalledWith({
      description: 'Unrestricted platform administration role',
      name: SUPER_ADMIN_ROLE,
      status: 'active',
    });
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: [{ username: superAdminUsername }, { email: 'admin@example.com' }],
    });
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        firstName: 'Super',
        lastName: 'Admin',
        roleId: 'role-1',
        status: 'active',
        username: superAdminUsername,
      }),
    );
    expect(usersRepository.create.mock.calls[0][0].passwordHash).not.toBe(
      defaultSuperAdminPassword,
    );
  });

  it('reuses an existing bootstrap admin without creating duplicates', async () => {
    rolesRepository.findOne.mockResolvedValue({
      id: 'role-1',
      name: SUPER_ADMIN_ROLE,
    });
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      roleId: 'role-1',
      status: 'active',
      username: superAdminUsername,
    });

    await service.onApplicationBootstrap();

    expect(rolesRepository.save).not.toHaveBeenCalled();
    expect(usersRepository.create).not.toHaveBeenCalled();
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('promotes an existing admin login to the super admin role', async () => {
    rolesRepository.findOne.mockResolvedValue({
      id: 'role-super-admin',
      name: SUPER_ADMIN_ROLE,
    });
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      roleId: 'role-admin',
      status: 'disabled',
      username: superAdminUsername,
    });

    await service.onApplicationBootstrap();

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        roleId: 'role-super-admin',
        status: 'active',
      }),
    );
  });
});
