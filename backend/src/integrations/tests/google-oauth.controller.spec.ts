import { GoogleOAuthController } from '../providers/google-drive';
import { ProviderType } from '..';

describe('GoogleOAuthController', () => {
  it('resolves Google provider and completes OAuth callback', () => {
    const provider = {
      completeGoogleOAuth: jest.fn(() => ({ status: 'connected' })),
    };
    const registry = {
      resolve: jest.fn(() => provider),
    };
    const controller = new GoogleOAuthController(registry as never);

    expect(
      controller.callback({
        code: 'authorization-code',
        state: 'signed-state',
      }),
    ).toEqual({ status: 'connected' });
    expect(registry.resolve).toHaveBeenCalledWith(ProviderType.GOOGLE_DRIVE);
    expect(provider.completeGoogleOAuth).toHaveBeenCalledWith({
      code: 'authorization-code',
      state: 'signed-state',
    });
  });
});
