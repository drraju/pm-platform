import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../permissions';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

export function RequirePermissions(...permissions: PermissionKey[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
}
