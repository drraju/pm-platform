import { Resource } from './entities/resource.entity';
import { ResourceResponseDto } from './dto/resource.dto';

export class ResourceMapper {
  static toResponse(resource: Resource): ResourceResponseDto {
    return {
      createdAt: resource.createdAt,
      description: resource.description ?? null,
      id: resource.id,
      name: resource.name,
      resourceType: resource.resourceType,
      roleName: resource.roleName ?? null,
      status: resource.status,
      updatedAt: resource.updatedAt,
      userId: resource.userId ?? null,
    };
  }

  static toResponses(resources: Resource[]): ResourceResponseDto[] {
    return resources.map((resource) => this.toResponse(resource));
  }
}
