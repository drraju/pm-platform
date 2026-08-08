import { ForbiddenException, NotFoundException } from '@nestjs/common';
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

function authorizationPolicy(overrides: {
  canManageProject?: boolean;
  canViewProject?: boolean;
} = {}) {
  return {
    canManageProject: jest
      .fn()
      .mockResolvedValue(overrides.canManageProject ?? true),
    canViewProject: jest
      .fn()
      .mockResolvedValue(overrides.canViewProject ?? true),
  };
}

function createService(
  documentRepository = repository<ProjectDocument>(),
  projectRepository = repository<{ id: string }>(),
  documentTypeRepository = repository<DocumentType>(),
  categoryRepository = repository<DocumentCategory>(),
  userRepository = repository<{ id: string }>(),
  auth = authorizationPolicy(),
) {
  return {
    auth,
    service: new DocumentsService(
      documentRepository as never,
      projectRepository as never,
      documentTypeRepository as never,
      categoryRepository as never,
      userRepository as never,
      auth as never,
    ),
  };
}

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
    const { service } = createService(
      documentRepository,
      projectRepository,
      documentTypeRepository,
      categoryRepository,
      userRepository,
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
    const { service } = createService();

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
    const { service } = createService(
      repository<ProjectDocument>(),
      projectRepository,
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

  it('allows contributors to update their own document metadata but not approve', async () => {
    const documentRepository = repository<ProjectDocument>();
    const ownedDocument = {
      ...storedDocument,
      createdById: 'contributor-1',
      ownerId: 'contributor-1',
    } as ProjectDocument;
    documentRepository.createQueryBuilder.mockReturnValue(
      queryBuilder(ownedDocument),
    );
    const { service } = createService(
      documentRepository,
      repository<{ id: string }>(),
      repository<DocumentType>(),
      repository<DocumentCategory>(),
      repository<{ id: string }>(),
      authorizationPolicy({ canManageProject: false, canViewProject: true }),
    );

    await expect(
      service.update(
        'document-1',
        { title: 'QA Evidence Pack' },
        {
          email: 'contributor@example.com',
          roleId: 'role-tm',
          userId: 'contributor-1',
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        title: 'QA Evidence Pack',
      }),
    );

    documentRepository.createQueryBuilder.mockReturnValue(
      queryBuilder(ownedDocument),
    );
    await expect(
      service.update(
        'document-1',
        { approvalStatus: DocumentApprovalStatus.APPROVED },
        {
          email: 'contributor@example.com',
          roleId: 'role-tm',
          userId: 'contributor-1',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updates mutable document governance metadata', async () => {
    const documentRepository = repository<ProjectDocument>();
    const updatedDocument = {
      ...storedDocument,
      approvalStatus: DocumentApprovalStatus.UNDER_REVIEW,
      category: { ...category, id: 'category-2', name: 'Business' },
      categoryId: 'category-2',
      documentType: { ...documentType, id: 'type-2', name: 'HLD' },
      documentTypeId: 'type-2',
      title: 'Business HLD',
    } as ProjectDocument;
    documentRepository.createQueryBuilder
      .mockReturnValueOnce(queryBuilder(storedDocument))
      .mockReturnValueOnce(queryBuilder(updatedDocument));
    const documentTypeRepository = repository<DocumentType>();
    documentTypeRepository.find.mockResolvedValue([documentType]);
    documentTypeRepository.findOne.mockResolvedValue({
      id: 'type-2',
      isActive: true,
      name: 'HLD',
    } as DocumentType);
    const categoryRepository = repository<DocumentCategory>();
    categoryRepository.find.mockResolvedValue([category]);
    categoryRepository.findOne.mockResolvedValue({
      id: 'category-2',
      isActive: true,
      name: 'Business',
    } as DocumentCategory);
    const userRepository = repository<{ id: string }>();
    userRepository.findOne.mockResolvedValue({ id: 'owner-1' });
    const { service } = createService(
      documentRepository,
      repository<{ id: string }>(),
      documentTypeRepository,
      categoryRepository,
      userRepository,
    );

    const updated = await service.update(
      'document-1',
      {
        approvalStatus: DocumentApprovalStatus.UNDER_REVIEW,
        category: 'Business',
        documentType: 'HLD',
        title: 'Business HLD',
      },
      { email: 'pm@example.com', roleId: 'role-1', userId: 'pm-1' },
    );

    expect(documentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalStatus: DocumentApprovalStatus.UNDER_REVIEW,
        categoryId: 'category-2',
        documentTypeId: 'type-2',
        title: 'Business HLD',
        updatedById: 'pm-1',
      }),
    );
    expect(updated.title).toBe('Business HLD');
    expect(updated.category).toBe('Business');
    expect(updated.documentType).toBe('HLD');
  });
});
