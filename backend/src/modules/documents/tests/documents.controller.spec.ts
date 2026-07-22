import { DocumentsController } from '../documents.controller';

describe('DocumentsController', () => {
  it('exposes project-scoped document links', async () => {
    const service = {
      findProjectDocuments: jest.fn(() => [{ id: 'document-1' }]),
    };
    const controller = new DocumentsController(service as never);

    expect(
      await controller.findProjectDocuments('project-1', {
        storageProvider: 'Confluence',
      }),
    ).toEqual([{ id: 'document-1' }]);
    expect(service.findProjectDocuments).toHaveBeenCalledWith('project-1', {
      storageProvider: 'Confluence',
    });
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
});
