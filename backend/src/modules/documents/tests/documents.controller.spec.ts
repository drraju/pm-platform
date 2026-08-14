import { DocumentsController } from '../documents.controller';

describe('DocumentsController', () => {
  it('exposes project-scoped document links', async () => {
    const service = {
      findProjectDocuments: jest.fn(() => [{ id: 'document-1' }]),
    };
    const controller = new DocumentsController(service as never);
    const request = {
      user: { email: 'user@example.com', roleId: 'role-1', userId: 'user-1' },
    } as never;

    expect(
      await controller.findProjectDocuments(
        'project-1',
        { storageProvider: 'Confluence' },
        request,
      ),
    ).toEqual([{ id: 'document-1' }]);
    expect(service.findProjectDocuments).toHaveBeenCalledWith(
      'project-1',
      { storageProvider: 'Confluence' },
      request.user,
    );
  });

  it('returns provider labels without provider authentication', () => {
    const service = {
      storageProviders: jest.fn(() => [
        { label: 'SharePoint', value: 'SHAREPOINT' },
        { label: 'Other', value: 'OTHER' },
      ]),
    };
    const controller = new DocumentsController(service as never);

    expect(controller.storageProviders()).toEqual([
      { label: 'SharePoint', value: 'SHAREPOINT' },
      { label: 'Other', value: 'OTHER' },
    ]);
  });

  it('updates document metadata through the existing patch endpoint', () => {
    const service = {
      update: jest.fn(() => ({
        id: 'document-1',
        title: 'Updated Title',
      })),
    };
    const controller = new DocumentsController(service as never);

    expect(
      controller.update(
        'document-1',
        { title: 'Updated Title' },
        {
          user: {
            email: 'pm@example.com',
            roleId: 'role-1',
            userId: 'user-1',
          },
        } as never,
      ),
    ).toEqual({
      id: 'document-1',
      title: 'Updated Title',
    });
    expect(service.update).toHaveBeenCalledWith(
      'document-1',
      { title: 'Updated Title' },
      {
        email: 'pm@example.com',
        roleId: 'role-1',
        userId: 'user-1',
      },
    );
  });
});
