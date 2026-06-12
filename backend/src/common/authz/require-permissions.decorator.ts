import { SetMetadata } from '@nestjs/common';
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
  PermissionKey,
} from './permissions';

export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAnyPermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
