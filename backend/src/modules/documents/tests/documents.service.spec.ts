import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../documents.service';
import {
  DocumentApprovalStatus,
  DocumentCategory,
  DocumentLinkStatus,
  DocumentReviewStatus,
  DocumentStorageProvider,
  DocumentType,
  ProjectDocument,
} from '../entities';

type RepositoryMock<T> = {
  create: jest.Mock<T, [Partial<T>]>;
  createQueryBuilder: jest.Mock;
  find: jest.Mock<Promise<T[]>, [unknown?]>;
  findOne: jest.Mock<Promise<T | null>, [unknown]>;
  save: jest.Mock<Promise<T>, [Partial<T> | Partial<T>[]]>;
  softRemove: jest.Mock<Promise<T>, [T]>;
};

function repository<T>(): RepositoryMock<T> {
  return {
    create: jest.fn((input: Partial<T>) => input as T),
    createQueryBuilder: jest.fn(),
    find: jest.fn<Promise<T[]>, [unknown?]>(),
    findOne: jest.fn<Promise<T | null>, [unknown]>(),
    save: jest.fn((input: Partial<T> | Partial<T>[]) =>
      Promise.resolve(Array.isArray(input) ? (input[0] as T) : (input as T)),
    ),
    softRemove: jest.fn((input: T) => Promise.resolve(input)),
  };
}

function queryBuilder(document: ProjectDocument) {
  return {
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([document]),
    getOne: jest.fn().mockResolvedValue(document),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  };
}

const documentType = {
  id: 'type-1',
  isActive: true,
  name: 'Architecture Diagram',
} as DocumentType;

const category = {
  id: 'category-1',
  isActive: true,
  name: 'Architecture',
} as DocumentCategory;

const storedDocument = {
  approvalStatus: DocumentApprovalStatus.APPROVED,
  category,
  categoryId: category.id,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  createdBy: {
    email: 'creator@example.com',
    firstName: 'Casey',
    id: 'creator-1',
    lastName: 'Creator',
  },
  createdById: 'creator-1',
  description: 'Approved decision',
  documentType,
  documentTypeId: documentType.id,
  externalUrl: 'https://example.com/adr-015',
  id: 'document-1',
  lastReviewedAt: new Date('2026-07-01T00:00:00.000Z'),
  linkStatus: DocumentLinkStatus.UNKNOWN,
  nextReviewAt: new Date('2099-07-01T00:00:00.000Z'),
  owner: {
    email: 'owner@example.com',
    firstName: 'Avery',
    id: 'owner-1',
    lastName: 'Owner',
  },
  ownerId: 'owner-1',
  projectId: '11111111-1111-4111-8111-111111111111',
  storageProvider: DocumentStorageProvider.CONFLUENCE,
  title: 'ADR-015',
  updatedAt: new Date('2026-07-02T00:00:00.000Z'),
  updatedBy: null,
  updatedById: null,
  version: '1.0',
} as ProjectDocument;

describe('DocumentsService', () => {
  it('creates provider-independent external document links with references and audit fields', async () => {
    const documentRepository = repository<ProjectDocument>();
    documentRepository.createQueryBuilder.mockReturnValue(
      queryBuilder(storedDocument),
    );
    const projectRepository = repository<{ id: string }>();
    projectRepository.findOne.mockResolvedValue({ id: 'project-1' });
    const documentTypeRepository = repository<DocumentType>();
    documentTypeRepository.find.mockResolvedValue([documentType]);
    documentTypeRepository.findOne.mockResolvedValue(documentType);
    const categoryRepository = repository<DocumentCategory>();
    categoryRepository.find.mockResolvedValue([category]);
    categoryRepository.findOne.mockResolvedValue(category);
    const userRepository = repository<{ id: string }>();
    userRepository.findOne.mockResolvedValue({ id: 'owner-1' });
    const service = new DocumentsService(
      documentRepository as never,
      projectRepository as never,
      documentTypeRepository as never,
      categoryRepository as never,
      userRepository as never,
    );

    const created = await service.create(
      {
        approvalStatus: DocumentApprovalStatus.APPROVED,
        category: 'Architecture',
        description: 'Approved decision',
        documentType: 'Architecture Diagram',
        externalUrl: 'https://example.com/adr-015',
        ownerId: 'owner-1',
        projectId: '11111111-1111-4111-8111-111111111111',
        storageProvider: DocumentStorageProvider.CONFLUENCE,
        title: 'ADR-015',
        version: '1.0',
      },
      { email: 'creator@example.com', roleId: 'role-1', userId: 'creator-1' },
    );

    expect(documentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalStatus: DocumentApprovalStatus.APPROVED,
        categoryId: category.id,
        createdById: 'creator-1',
        documentTypeId: documentType.id,
        linkStatus: DocumentLinkStatus.UNKNOWN,
        ownerId: 'owner-1',
        storageProvider: DocumentStorageProvider.CONFLUENCE,
        updatedById: 'creator-1',
      }),
    );
    expect(created.reviewStatus).toBe(DocumentReviewStatus.CURRENT);
    expect(created.owner?.displayName).toBe('Avery Owner');
  });

  it('lists configured storage provider labels without authenticating', () => {
    const service = new DocumentsService(
      repository<ProjectDocument>() as never,
      repository<{ id: string }>() as never,
      repository<DocumentType>() as never,
      repository<DocumentCategory>() as never,
      repository<{ id: string }>() as never,
    );

    expect(service.storageProviders()).toEqual(
      expect.arrayContaining([
        {
          label: 'SharePoint',
          value: DocumentStorageProvider.SHAREPOINT,
        },
        {
          label: 'Network Share',
          value: DocumentStorageProvider.NETWORK_SHARE,
        },
      ]),
    );
  });

  it('rejects document links for unknown projects', async () => {
    const projectRepository = repository<{ id: string }>();
    projectRepository.findOne.mockResolvedValue(null);
    const service = new DocumentsService(
      repository<ProjectDocument>() as never,
      projectRepository as never,
      repository<DocumentType>() as never,
      repository<DocumentCategory>() as never,
      repository<{ id: string }>() as never,
    );

    await expect(
      service.create({
        documentType: 'Test Plan',
        externalUrl: 'https://example.com/plan',
        projectId: '11111111-1111-4111-8111-111111111111',
        storageProvider: DocumentStorageProvider.OTHER,
        title: 'Plan',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
