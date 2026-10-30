import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CustomersService } from '../customers.service';
import { Customer } from '../entities/customer.entity';

function owner(id: string, firstName: string) {
  return {
    email: `${firstName.toLowerCase()}@example.com`,
    firstName,
    id,
    identityType: 'HUMAN',
    lastName: 'Owner',
    status: 'active',
  };
}

function customer(partial: Partial<Customer> & Pick<Customer, 'id' | 'ownerId'>): Customer {
  return {
    commercialNote: 'Deal terms',
    domain: 'example.com',
    name: 'Northwind',
    renewalDate: '2026-12-01',
    status: 'active',
    successNote: 'Renewal risk',
    ...partial,
    owner: owner(partial.ownerId, partial.ownerId === 'sales-1' ? 'Sam' : 'Asha'),
  } as Customer;
}

describe('CustomersService', () => {
  const rows = [
    customer({ id: 'owned-by-asha', name: 'Asha Book', ownerId: 'cs-1' }),
    customer({ id: 'owned-by-sam', name: 'Sam Book', ownerId: 'sales-1' }),
    customer({ id: 'closed', name: 'Closed Book', ownerId: 'cs-1', status: 'closed' }),
  ];

  function serviceFor(roleNames: string[]) {
    const customersRepository = {
      create: (input: Partial<Customer>) => input,
      find: async ({ where }: { where: { ownerId?: string; status?: string } }) =>
        rows.filter((row) => {
          if (where.ownerId && row.ownerId !== where.ownerId) return false;
          if (where.status && row.status !== where.status) return false;
          return true;
        }),
      findOne: async ({ where }: { where: { id: string } }) =>
        rows.find((row) => row.id === where.id) ?? null,
      save: async (input: Customer) => input,
    };
    const usersRepository = {
      find: async () => [owner('cs-1', 'Asha'), owner('sales-1', 'Sam')],
      findOne: async ({ where }: { where: { id: string } }) =>
        [owner('cs-1', 'Asha'), owner('sales-1', 'Sam')].find((user) => user.id === where.id) ?? null,
    };
    const authorizationPolicyService = {
      getActorRoleNames: async () => roleNames,
      isExternalActor: async () =>
        roleNames.length > 0 &&
        roleNames.every(
          (name) => name === UserRole.Customer || name === UserRole.Partner,
        ),
    };

    return new CustomersService(
      customersRepository as never,
      usersRepository as never,
      authorizationPolicyService as never,
    );
  }

  it('shows each customer success manager only the customers they own, without the sales note', async () => {
    const service = serviceFor([UserRole.CustomerSuccessManager]);
    const visible = await service.list({ roleId: 'role', userId: 'cs-1' });

    expect(visible.map((customer) => customer.name)).toEqual(['Asha Book']);
    expect(visible[0]).toMatchObject({ projectCount: 0, successNote: 'Renewal risk' });
    expect(visible[0]).not.toHaveProperty('commercialNote');
    expect(visible[0]).not.toHaveProperty('risks');
    expect(visible[0]).not.toHaveProperty('issues');
    await expect(service.get({ roleId: 'role', userId: 'cs-1' }, 'owned-by-sam')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('hides the success note from sales and the commercial note from customer success', async () => {
    const sales = await serviceFor([UserRole.Sales]).get(
      { roleId: 'role', userId: 'sales-1' },
      'owned-by-sam',
    );
    expect(sales.commercialNote).toBe('Deal terms');
    expect(sales).not.toHaveProperty('successNote');

    const success = serviceFor([UserRole.CustomerSuccessManager]);
    await expect(
      success.update({ roleId: 'role', userId: 'cs-1' }, 'owned-by-asha', {
        commercialNote: 'should not stick',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const salesBook = serviceFor([UserRole.Sales]);
    await expect(
      salesBook.update({ roleId: 'role', userId: 'sales-1' }, 'owned-by-sam', {
        lastTouch: '2026-10-01',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets an admin see both books, including a closed customer when the filter is all', async () => {
    const service = serviceFor([UserRole.Admin]);
    const active = await service.list({ roleId: 'role', userId: 'admin-1' });
    const all = await service.list({ roleId: 'role', userId: 'admin-1' }, 'all');

    expect(active.map((customer) => customer.name).sort()).toEqual(['Asha Book', 'Sam Book']);
    expect(all.map((customer) => customer.name)).toContain('Closed Book');
    expect(all[0]).toMatchObject({ commercialNote: 'Deal terms', successNote: 'Renewal risk' });
  });

  it('keeps a closed customer out of the default active list', async () => {
    const service = serviceFor([UserRole.CustomerSuccessManager]);
    const active = await service.list({ roleId: 'role', userId: 'cs-1' });
    const closed = await service.list({ roleId: 'role', userId: 'cs-1' }, 'closed');

    expect(active.map((customer) => customer.id)).toEqual(['owned-by-asha']);
    expect(closed.map((customer) => customer.id)).toEqual(['closed']);
  });

  it('hides the customer book from a contact', async () => {
    const service = serviceFor([UserRole.Customer]);

    await expect(service.list({ roleId: 'role', userId: 'contact-1' }, 'all')).resolves.toEqual(
      [],
    );
    await expect(service.get({ roleId: 'role', userId: 'contact-1' }, 'owned-by-asha')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
