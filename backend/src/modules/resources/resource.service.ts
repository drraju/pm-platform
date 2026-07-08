import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { Resource } from './entities/resource.entity';
import { ResourceStatus } from './enums/resource-status.enum';
import { ResourceType } from './enums/resource-type.enum';
import { ResourceValidationService } from './resource-validation.service';

export type CreateResourceInput = {
  description?: string | null;
  name: string;
  resourceType: ResourceType;
  roleName?: string | null;
  status?: ResourceStatus;
  userId?: string | null;
};

export type UpdateResourceInput = Partial<CreateResourceInput>;

export type ListResourcesInput = {
  includeArchived?: boolean;
  resourceType?: ResourceType;
  search?: string;
  status?: ResourceStatus;
};

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
    private readonly resourceValidationService: ResourceValidationService,
  ) {}

  async createResource(
    input: CreateResourceInput,
    actor?: AuthorizationActor,
  ): Promise<Resource> {
    this.resourceValidationService.validateResource(input);
    await this.ensureUniqueName(input.name);

    const resource = this.resourcesRepository.create({
      description: input.description ?? null,
      name: input.name.trim(),
      resourceType: input.resourceType,
      roleName: input.roleName?.trim() || null,
      status: input.status ?? ResourceStatus.Draft,
      userId: input.userId ?? null,
      createdById: actor?.userId,
      updatedById: actor?.userId,
    });

    return this.resourcesRepository.save(resource);
  }

  async updateResource(
    resourceId: string,
    input: UpdateResourceInput,
    actor?: AuthorizationActor,
  ): Promise<Resource> {
    this.resourceValidationService.validateResource(input);

    if (input.name !== undefined) {
      await this.ensureUniqueName(input.name, resourceId);
    }

    const resource = await this.findResource(resourceId);
    Object.assign(resource, {
      ...input,
      description:
        input.description !== undefined
          ? input.description
          : resource.description,
      name: input.name?.trim() ?? resource.name,
      roleName:
        input.roleName !== undefined
          ? input.roleName?.trim() || null
          : resource.roleName,
      updatedById: actor?.userId,
      userId: input.userId !== undefined ? input.userId : resource.userId,
    });

    return this.resourcesRepository.save(resource);
  }

  async archiveResource(
    resourceId: string,
    actor?: AuthorizationActor,
  ): Promise<Resource> {
    const resource = await this.findResource(resourceId);
    resource.status = ResourceStatus.Archived;
    resource.updatedById = actor?.userId;
    return this.resourcesRepository.save(resource);
  }

  async listResources(input: ListResourcesInput = {}): Promise<Resource[]> {
    this.resourceValidationService.validateResource({
      resourceType: input.resourceType,
      status: input.status,
    });

    const where = this.buildResourceListWhere(input);
    return this.resourcesRepository.find({
      order: { createdAt: 'ASC', name: 'ASC' },
      where,
    });
  }

  async findResource(resourceId: string): Promise<Resource> {
    const resource = await this.resourcesRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }

    return resource;
  }

  private buildResourceListWhere(
    input: ListResourcesInput,
  ): FindOptionsWhere<Resource>[] | FindOptionsWhere<Resource> {
    const baseWhere: FindOptionsWhere<Resource> = {};

    if (!input.includeArchived && !input.status) {
      baseWhere.status = Not(ResourceStatus.Archived);
    }

    if (input.status) {
      baseWhere.status = input.status;
    }

    if (input.resourceType) {
      baseWhere.resourceType = input.resourceType;
    }

    const search = input.search?.trim();
    if (!search) {
      return baseWhere;
    }

    return [
      { ...baseWhere, name: ILike(`%${search}%`) },
      { ...baseWhere, roleName: ILike(`%${search}%`) },
    ];
  }

  private async ensureUniqueName(name: string, resourceId?: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      this.resourceValidationService.validateResource({ name });
    }

    const existingResource = await this.resourcesRepository.findOne({
      where: resourceId
        ? { id: Not(resourceId), name: trimmedName }
        : { name: trimmedName },
    });

    if (existingResource) {
      throw new ConflictException('Resource name already exists');
    }
  }
}
