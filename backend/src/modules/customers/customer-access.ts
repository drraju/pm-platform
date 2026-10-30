import { UserRole } from '../../common/enums/user-role.enum';

export const customerStatuses = ['prospect', 'active', 'paused', 'closed'] as const;

export type CustomerStatus = (typeof customerStatuses)[number];

export type CustomerNoteAccess = {
  commercial: boolean;
  renewal: boolean;
  seesAll: boolean;
  success: boolean;
};

export function customerNoteAccess(roleNames: string[]): CustomerNoteAccess {
  const admin = roleNames.some(
    (roleName) =>
      roleName === UserRole.PlatformAdmin || roleName === UserRole.Admin,
  );

  return {
    commercial: admin || roleNames.includes(UserRole.Sales),
    renewal: admin || roleNames.includes(UserRole.CustomerSuccessManager),
    seesAll: admin || roleNames.includes(UserRole.Executive),
    success: admin || roleNames.includes(UserRole.CustomerSuccessManager),
  };
}

export type CustomerView = {
  commercialNote?: string | null;
  domain: string | null;
  id: string;
  name: string;
  owner: {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
  };
  lastTouch: string | null;
  projectCount: number;
  renewalDate: string | null;
  status: CustomerStatus;
  successNote?: string | null;
};

export function presentCustomer(
  customer: {
    commercialNote: string | null;
    domain: string | null;
    id: string;
    name: string;
    owner: CustomerView['owner'];
    lastTouch: string | null;
    projectCount: number;
    renewalDate: string | null;
    status: CustomerStatus;
    successNote: string | null;
  },
  access: CustomerNoteAccess,
): CustomerView {
  return {
    domain: customer.domain,
    id: customer.id,
    name: customer.name,
    owner: customer.owner,
    lastTouch: customer.lastTouch,
    projectCount: customer.projectCount,
    renewalDate: customer.renewalDate,
    status: customer.status,
    ...(access.commercial ? { commercialNote: customer.commercialNote } : {}),
    ...(access.success ? { successNote: customer.successNote } : {}),
  };
}
