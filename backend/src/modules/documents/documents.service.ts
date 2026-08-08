import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateProjectDocumentDto,
  ProjectDocumentQueryDto,
  ProjectDocumentSortBy,
  SortDirection,
  UpdateProjectDocumentDto,
} from './dto';
import {
  DocumentApprovalStatus,
  DocumentCategory,
  DocumentLinkStatus,
  DocumentReviewStatus,
  DocumentStorageProvider,
  DocumentType,
  ProjectDocument,
} from './entities';
import { DOCUMENT_STORAGE_PROVIDER_LABELS } from './entities/project-document.entity';

export const DOCUMENT_TYPE_SEED_VALUES = [
  'Business Case',
  'Project Charter',
  'PID',
  'HLD',
  'LLD',
  'Architecture Diagram',
  'Solution Design',
  'API Specification',
  'Data Model',
  'Test Strategy',
  'Test Plan',
  'Test Cases',
  'Test Results',
  'Deployment Guide',
  'Installation Guide',
  'Runbook',
  'Operations Guide',
  'SOP',
  'User Guide',
  'Training Material',
  'RAID',
  'Lessons Learned',
  'Release Notes',
  'Other',
] as const;

export const DOCUMENT_CATEGORY_SEED_VALUES = [
  'Business',
  'Architecture',
  'Development',
  'Testing',
  'Operations',
  'Project Management',
  'Security',
  'Infrastructure',
  'Compliance',
  'Training',
  'Other',
] as const;

export type DocumentReferenceValue = {
  id: string;
  name: string;
};

export type StorageProviderReference = {
  label: string;
  value: DocumentStorageProvider;
};

export type ProjectDocumentResponse = {
  approvalStatus: DocumentApprovalStatus;
  category: string | null;
  categoryId: string | null;
  createdAt: Date;
  createdBy: UserSummary | null;
  createdById: string | null;
  description: string | null;
  documentType: string;
  documentTypeId: string;
  externalUrl: string;
  id: string;
  lastReviewedAt: Date | null;
  linkStatus: DocumentLinkStatus;
  nextReviewAt: Date | null;
  owner: UserSummary | null;
  ownerId: string | null;
  projectId: string;
  reviewStatus: DocumentReviewStatus;
  storageProvider: DocumentStorageProvider;
  storageProviderLabel: string;
  title: string;
  updatedAt: Date;
  updatedBy: UserSummary | null;
  updatedById: string | null;
  version: string | null;
};

export type ProjectDocumentSummary = {
  approved: number;
  byCategory: Record<string, number>;
  byStorageProvider: Record<string, number>;
  draft: number;
  overdueReviews: number;
  totalDocuments: number;
  underReview: number;
};

type UserSummary = {
  displayName: string;
  email: string;
  id: string;
};

const contributorApprovalStatuses = new Set<DocumentApprovalStatus>([
  DocumentApprovalStatus.DRAFT,
  DocumentApprovalStatus.UNDER_REVIEW,
]);

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ProjectDocument)
    private readonly documentRepository: Repository<ProjectDocument>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentCategory)
    private readonly documentCategoryRepository: Repository<DocumentCategory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  storageProviders(): StorageProviderReference[] {
    return Object.values(DocumentStorageProvider).map((value) => ({
      label: DOCUMENT_STORAGE_PROVIDER_LABELS[value],
      value,
    }));
  }

  async documentTypes(): Promise<DocumentReferenceValue[]> {
    await this.ensureReferenceData();
    const documentTypes = await this.documentTypeRepository.find({
      order: { name: 'ASC' },
      where: { isActive: true },
    });
    return documentTypes.map(({ id, name }) => ({ id, name }));
  }

  async categories(): Promise<DocumentReferenceValue[]> {
    await this.ensureReferenceData();
    const categories = await this.documentCategoryRepository.find({
      order: { name: 'ASC' },
      where: { isActive: true },
    });
    return categories.map(({ id, name }) => ({ id, name }));
  }

  async create(
    input: CreateProjectDocumentDto,
    actor?: AuthorizationActor,
  ): Promise<ProjectDocumentResponse> {
    await this.ensureProjectExists(input.projectId);
    await this.ensureCanContributeDocument(input.projectId, actor);
    const canManage = await this.authorizationPolicyService.canManageProject(
      input.projectId,
      actor,
    );
    const ownerId = input.ownerId ?? actor?.userId ?? null;
    await this.ensureUserExists(ownerId);
    const approvalStatus = canManage
      ? (input.approvalStatus ?? DocumentApprovalStatus.DRAFT)
      : this.resolveContributorApprovalStatus(input.approvalStatus);
    const [documentType, category] = await Promise.all([
      this.resolveDocumentType(input.documentType),
      this.resolveCategory(input.category),
    ]);

    const document = await this.documentRepository.save(
      this.documentRepository.create({
        approvalStatus,
        categoryId: category?.id ?? null,
        createdById: actor?.userId,
        description: input.description ?? null,
        documentTypeId: documentType.id,
        externalUrl: input.externalUrl,
        lastReviewedAt: parseNullableDate(input.lastReviewedAt),
        linkStatus: DocumentLinkStatus.UNKNOWN,
        nextReviewAt: parseNullableDate(input.nextReviewAt),
        ownerId,
        projectId: input.projectId,
        storageProvider: input.storageProvider,
        title: input.title,
        updatedById: actor?.userId,
        version: input.version ?? null,
      }),
    );

    return this.findOne(document.id);
  }

  async findProjectDocuments(
    projectId: string,
    query: ProjectDocumentQueryDto = {},
  ): Promise<ProjectDocumentResponse[]> {
    await this.ensureProjectExists(projectId);

    const queryBuilder = this.baseDocumentQuery()
      .where('document.project_id = :projectId', { projectId })
      .andWhere('document.deleted_at IS NULL');

    this.applyFilters(queryBuilder, query);
    this.applySorting(queryBuilder, query);

    const documents = await queryBuilder.getMany();
    return documents.map((document) => this.toResponse(document));
  }

  async summary(projectId: string): Promise<ProjectDocumentSummary> {
    const documents = await this.findProjectDocuments(projectId);
    const summary: ProjectDocumentSummary = {
      approved: 0,
      byCategory: {},
      byStorageProvider: {},
      draft: 0,
      overdueReviews: 0,
      totalDocuments: documents.length,
      underReview: 0,
    };

    for (const document of documents) {
      if (document.approvalStatus === DocumentApprovalStatus.APPROVED) {
        summary.approved += 1;
      }
      if (document.approvalStatus === DocumentApprovalStatus.DRAFT) {
        summary.draft += 1;
      }
      if (document.approvalStatus === DocumentApprovalStatus.UNDER_REVIEW) {
        summary.underReview += 1;
      }
      if (document.reviewStatus === DocumentReviewStatus.OVERDUE) {
        summary.overdueReviews += 1;
      }
      increment(summary.byStorageProvider, document.storageProviderLabel);
      increment(summary.byCategory, document.category ?? 'Uncategorized');
    }

    return summary;
  }

  async update(
    documentId: string,
    input: UpdateProjectDocumentDto,
    actor?: AuthorizationActor,
  ): Promise<ProjectDocumentResponse> {
    const document = await this.findEntity(documentId);
    const canManage = await this.authorizationPolicyService.canManageProject(
      document.projectId,
      actor,
    );
    const isContributorOwner = this.isDocumentContributor(document, actor);
    if (!canManage && !isContributorOwner) {
      throw new ForbiddenException(
        'Only document owners or project managers can update this document',
      );
    }
    if (!canManage) {
      await this.ensureCanContributeDocument(document.projectId, actor);
      this.assertContributorUpdateAllowed(document, input);
    }

    if (input.projectId && input.projectId !== document.projectId) {
      if (!canManage) {
        throw new ForbiddenException(
          'Contributors cannot move documents between projects',
        );
      }
      await this.ensureProjectExists(input.projectId);
    }
    await this.ensureUserExists(input.ownerId);

    if (input.documentType) {
      const documentType = await this.resolveDocumentType(input.documentType);
      document.documentTypeId = documentType.id;
    }
    if (input.category !== undefined) {
      const category = await this.resolveCategory(input.category);
      document.categoryId = category?.id ?? null;
    }

    if (input.approvalStatus !== undefined) {
      document.approvalStatus = canManage
        ? input.approvalStatus
        : this.resolveContributorApprovalStatus(input.approvalStatus);
    }
    document.description =
      input.description === undefined
        ? document.description
        : input.description;
    document.externalUrl = input.externalUrl ?? document.externalUrl;
    document.lastReviewedAt =
      input.lastReviewedAt === undefined
        ? document.lastReviewedAt
        : parseNullableDate(input.lastReviewedAt);
    document.nextReviewAt =
      input.nextReviewAt === undefined
        ? document.nextReviewAt
        : parseNullableDate(input.nextReviewAt);
    if (canManage) {
      document.ownerId =
        input.ownerId === undefined ? document.ownerId : input.ownerId;
      document.projectId = input.projectId ?? document.projectId;
    }
    document.storageProvider =
      input.storageProvider ?? document.storageProvider;
    document.title = input.title ?? document.title;
    document.updatedById = actor?.userId ?? document.updatedById;
    document.version =
      input.version === undefined ? document.version : input.version;

    await this.documentRepository.save(document);
    return this.findOne(document.id);
  }

  async remove(documentId: string, actor?: AuthorizationActor): Promise<void> {
    const document = await this.findEntity(documentId);
    if (
      !(await this.authorizationPolicyService.canManageProject(
        document.projectId,
        actor,
      ))
    ) {
      throw new ForbiddenException(
        'Only project managers can delete document links',
      );
    }
    document.deletedById = actor?.userId ?? document.deletedById;
    await this.documentRepository.save(document);
    await this.documentRepository.softRemove(document);
  }

  private async ensureCanContributeDocument(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<void> {
    if (
      !(await this.authorizationPolicyService.canViewProject(projectId, actor))
    ) {
      throw new ForbiddenException(
        'Project document contribution requires project access',
      );
    }
  }

  private isDocumentContributor(
    document: ProjectDocument,
    actor?: AuthorizationActor,
  ): boolean {
    if (!actor?.userId) {
      return false;
    }
    return (
      document.ownerId === actor.userId ||
      document.createdById === actor.userId
    );
  }

  private resolveContributorApprovalStatus(
    approvalStatus?: DocumentApprovalStatus,
  ): DocumentApprovalStatus {
    if (!approvalStatus) {
      return DocumentApprovalStatus.DRAFT;
    }
    if (!contributorApprovalStatuses.has(approvalStatus)) {
      throw new ForbiddenException(
        'Contributors cannot approve or archive project documents',
      );
    }
    return approvalStatus;
  }

  private assertContributorUpdateAllowed(
    document: ProjectDocument,
    input: UpdateProjectDocumentDto,
  ): void {
    if (
      input.ownerId !== undefined &&
      input.ownerId !== document.ownerId &&
      input.ownerId !== document.createdById
    ) {
      throw new ForbiddenException(
        'Contributors cannot transfer document ownership',
      );
    }
    if (
      input.approvalStatus !== undefined &&
      !contributorApprovalStatuses.has(input.approvalStatus)
    ) {
      throw new ForbiddenException(
        'Contributors cannot approve or archive project documents',
      );
    }
  }

  private async findOne(documentId: string): Promise<ProjectDocumentResponse> {
    return this.toResponse(await this.findEntity(documentId));
  }

  private async findEntity(documentId: string): Promise<ProjectDocument> {
    const document = await this.baseDocumentQuery()
      .where('document.id = :documentId', { documentId })
      .andWhere('document.deleted_at IS NULL')
      .getOne();
    if (!document) {
      throw new NotFoundException('Document link not found.');
    }

    return document;
  }

  private baseDocumentQuery(): SelectQueryBuilder<ProjectDocument> {
    return this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.owner', 'owner')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.updatedBy', 'updatedBy');
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<ProjectDocument>,
    query: ProjectDocumentQueryDto,
  ): void {
    if (query.category) {
      queryBuilder.andWhere('category.name = :category', {
        category: query.category,
      });
    }
    if (query.documentType) {
      queryBuilder.andWhere('documentType.name = :documentType', {
        documentType: query.documentType,
      });
    }
    if (query.approvalStatus) {
      queryBuilder.andWhere('document.approval_status = :approvalStatus', {
        approvalStatus: query.approvalStatus,
      });
    }
    if (query.storageProvider) {
      queryBuilder.andWhere('document.storage_provider = :storageProvider', {
        storageProvider: query.storageProvider,
      });
    }
    if (query.ownerId) {
      queryBuilder.andWhere('document.owner_id = :ownerId', {
        ownerId: query.ownerId,
      });
    }
    if (query.version) {
      queryBuilder.andWhere('document.version = :version', {
        version: query.version,
      });
    }
    if (query.title) {
      queryBuilder.andWhere('document.title ILIKE :title', {
        title: `%${query.title}%`,
      });
    }
    if (query.description) {
      queryBuilder.andWhere('document.description ILIKE :description', {
        description: `%${query.description}%`,
      });
    }
    this.applyReviewStatusFilter(queryBuilder, query.reviewStatus);
  }

  private applyReviewStatusFilter(
    queryBuilder: SelectQueryBuilder<ProjectDocument>,
    reviewStatus?: DocumentReviewStatus,
  ): void {
    if (!reviewStatus) {
      return;
    }
    const now = new Date();
    const dueSoon = new Date(now);
    dueSoon.setDate(dueSoon.getDate() + 30);

    if (reviewStatus === DocumentReviewStatus.NEVER_REVIEWED) {
      queryBuilder.andWhere('document.last_reviewed_at IS NULL');
    }
    if (reviewStatus === DocumentReviewStatus.OVERDUE) {
      queryBuilder.andWhere('document.next_review_at < :now', { now });
    }
    if (reviewStatus === DocumentReviewStatus.REVIEW_DUE_SOON) {
      queryBuilder.andWhere(
        new Brackets((where) => {
          where
            .where('document.next_review_at >= :now', { now })
            .andWhere('document.next_review_at <= :dueSoon', { dueSoon });
        }),
      );
    }
    if (reviewStatus === DocumentReviewStatus.CURRENT) {
      queryBuilder.andWhere(
        new Brackets((where) => {
          where.where('document.last_reviewed_at IS NOT NULL').andWhere(
            new Brackets((nested) => {
              nested
                .where('document.next_review_at IS NULL')
                .orWhere('document.next_review_at > :dueSoon', { dueSoon });
            }),
          );
        }),
      );
    }
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<ProjectDocument>,
    query: ProjectDocumentQueryDto,
  ): void {
    const direction = query.sortDirection ?? SortDirection.DESC;
    const sortMap: Record<ProjectDocumentSortBy, string> = {
      [ProjectDocumentSortBy.APPROVAL_STATUS]: 'document.approval_status',
      [ProjectDocumentSortBy.CREATED_AT]: 'document.created_at',
      [ProjectDocumentSortBy.LAST_REVIEWED_AT]: 'document.last_reviewed_at',
      [ProjectDocumentSortBy.NEXT_REVIEW_AT]: 'document.next_review_at',
      [ProjectDocumentSortBy.OWNER]: 'owner.lastName',
      [ProjectDocumentSortBy.TITLE]: 'document.title',
      [ProjectDocumentSortBy.UPDATED_AT]: 'document.updated_at',
      [ProjectDocumentSortBy.VERSION]: 'document.version',
    };
    queryBuilder.orderBy(
      sortMap[query.sortBy ?? ProjectDocumentSortBy.UPDATED_AT],
      direction,
      'NULLS LAST',
    );
    if (query.sortBy === ProjectDocumentSortBy.OWNER) {
      queryBuilder.addOrderBy('owner.firstName', direction, 'NULLS LAST');
    }
  }

  private async resolveDocumentType(name: string): Promise<DocumentType> {
    await this.ensureReferenceData();
    const documentType = await this.documentTypeRepository.findOne({
      where: { isActive: true, name },
    });
    if (!documentType) {
      throw new NotFoundException('Document type not found.');
    }
    return documentType;
  }

  private async resolveCategory(
    name?: string | null,
  ): Promise<DocumentCategory | null> {
    await this.ensureReferenceData();
    if (!name) {
      return null;
    }
    const category = await this.documentCategoryRepository.findOne({
      where: { isActive: true, name },
    });
    if (!category) {
      throw new NotFoundException('Document category not found.');
    }
    return category;
  }

  private async ensureReferenceData(): Promise<void> {
    await Promise.all([
      this.ensureValues(this.documentTypeRepository, DOCUMENT_TYPE_SEED_VALUES),
      this.ensureValues(
        this.documentCategoryRepository,
        DOCUMENT_CATEGORY_SEED_VALUES,
      ),
    ]);
  }

  private async ensureValues<T extends DocumentType | DocumentCategory>(
    repository: Repository<T>,
    names: readonly string[],
  ): Promise<void> {
    const existing = await repository.find();
    const existingNames = new Set(existing.map((value) => value.name));
    const missing = names.filter((name) => !existingNames.has(name));
    if (missing.length === 0) {
      return;
    }
    const references = missing.map((name) => ({ isActive: true, name }));
    await repository.save(references as DeepPartial<T>[]);
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found.');
    }
  }

  private async ensureUserExists(userId?: string | null): Promise<void> {
    if (!userId) {
      return;
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Owner not found.');
    }
  }

  private toResponse(document: ProjectDocument): ProjectDocumentResponse {
    return {
      approvalStatus: document.approvalStatus,
      category: document.category?.name ?? null,
      categoryId: document.categoryId ?? null,
      createdAt: document.createdAt,
      createdBy: toUserSummary(document.createdBy),
      createdById: document.createdById ?? null,
      description: document.description ?? null,
      documentType: document.documentType.name,
      documentTypeId: document.documentTypeId,
      externalUrl: document.externalUrl,
      id: document.id,
      lastReviewedAt: document.lastReviewedAt ?? null,
      linkStatus: document.linkStatus,
      nextReviewAt: document.nextReviewAt ?? null,
      owner: toUserSummary(document.owner),
      ownerId: document.ownerId ?? null,
      projectId: document.projectId,
      reviewStatus: calculateReviewStatus(document),
      storageProvider: document.storageProvider,
      storageProviderLabel:
        DOCUMENT_STORAGE_PROVIDER_LABELS[document.storageProvider],
      title: document.title,
      updatedAt: document.updatedAt,
      updatedBy: toUserSummary(document.updatedBy),
      updatedById: document.updatedById ?? null,
      version: document.version ?? null,
    };
  }
}

function calculateReviewStatus(
  document: ProjectDocument,
): DocumentReviewStatus {
  if (!document.lastReviewedAt) {
    return DocumentReviewStatus.NEVER_REVIEWED;
  }
  if (!document.nextReviewAt) {
    return DocumentReviewStatus.CURRENT;
  }

  const now = new Date();
  if (document.nextReviewAt < now) {
    return DocumentReviewStatus.OVERDUE;
  }

  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 30);
  if (document.nextReviewAt <= dueSoon) {
    return DocumentReviewStatus.REVIEW_DUE_SOON;
  }

  return DocumentReviewStatus.CURRENT;
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function parseNullableDate(value?: string | null): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? new Date(value) : null;
}

function toUserSummary(user?: User | null): UserSummary | null {
  if (!user) {
    return null;
  }
  return {
    displayName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    email: user.email,
    id: user.id,
  };
}
