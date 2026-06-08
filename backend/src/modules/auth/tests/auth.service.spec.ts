import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByLoginIdentifier: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(() => {
    usersService = {
      findByLoginIdentifier: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('token'),
    };
    service = new AuthService(
      usersService as never,
      jwtService as never,
      {} as never,
    );
  });

  it('logs in the bootstrap super admin by username', async () => {
    usersService.findByLoginIdentifier.mockResolvedValue({
      email: 'admin@example.com',
      id: 'user-1',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      roleId: 'role-1',
    });

    await expect(
      service.login({ email: 'admin', password: 'Admin123!' }),
    ).resolves.toEqual({
      accessToken: 'token',
      refreshToken: 'token',
    });
    expect(usersService.findByLoginIdentifier).toHaveBeenCalledWith('admin');
  });

  it('rejects invalid username credentials', async () => {
    usersService.findByLoginIdentifier.mockResolvedValue(null);

    await expect(
      service.login({ email: 'admin', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
