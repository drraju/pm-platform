import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AdminGuard } from '../guards/admin.guard';

describe('AdminGuard', () => {
  let authorizationService: { getEffectiveUser: jest.Mock };
  let guard: AdminGuard;

  beforeEach(async () => {
    authorizationService = {
      getEffectiveUser: jest
        .fn()
        .mockResolvedValue({ roleName: 'SUPER_ADMIN' }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthorizationService, useValue: authorizationService },
      ],
    }).compile();

    guard = moduleRef.get(AdminGuard);
  });

  it('allows Super Admin users', async () => {
    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('blocks non-Super Admin users', async () => {
    authorizationService.getEffectiveUser.mockResolvedValueOnce({
      roleName: 'Admin',
    });

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

function createContext() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { userId: 'user-1' },
      }),
    }),
  } as never;
}
