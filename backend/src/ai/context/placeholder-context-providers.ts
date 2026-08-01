import { Injectable } from '@nestjs/common';
import { ContextProvider } from './context-provider.interface';
import {
  AiContextMetadata,
  AiContextProviderDescriptor,
  AiContextResourceType,
  AiContextSelectionRequest,
  AiContextSensitivity,
  AiContextType,
} from './context-provider.types';
import {
  EnterpriseContextFragment,
  EnterpriseContextProviderRequest,
} from './enterprise-context.types';

type PlaceholderContextProviderOptions = {
  contextType: AiContextType;
  id: string;
  name: string;
  priority: number;
  sensitivity: AiContextSensitivity;
  supportedResources: readonly AiContextResourceType[];
};

const commonCapabilities = ['chat', 'reasoning', 'structured-output'];

abstract class PlaceholderContextProvider implements ContextProvider {
  protected constructor(
    private readonly options: PlaceholderContextProviderOptions,
  ) {}

  describeContextProvider(): AiContextProviderDescriptor {
    return {
      contextType: this.options.contextType,
      dependencies: [],
      id: this.options.id,
      lifecycleState: 'registered',
      name: this.options.name,
      priority: this.options.priority,
      supportedCapabilities: commonCapabilities,
      supportedResources: this.options.supportedResources,
      version: '1.0.0',
    };
  }

  selectContext(
    request: AiContextSelectionRequest,
  ): Promise<readonly AiContextMetadata[]> {
    const descriptor = this.describeContextProvider();

    if (!descriptor.supportedCapabilities.includes(request.capabilityId)) {
      return Promise.resolve([]);
    }

    const resource = request.requestedResources?.find((requestedResource) =>
      descriptor.supportedResources.includes(requestedResource.type),
    ) ?? {
      id: this.getDefaultResourceId(descriptor.supportedResources[0], request),
      type: descriptor.supportedResources[0],
    };

    return Promise.resolve([
      {
        classification: 'internal',
        confidence: 1,
        contextType: descriptor.contextType,
        estimatedTokenSize: 0,
        freshness: 'unknown',
        generatedAt: request.executionContext.timestamp,
        id: `${descriptor.id}:${resource.type}:${resource.id ?? 'metadata'}`,
        priority: descriptor.priority,
        sensitivity: this.options.sensitivity,
        source: {
          providerId: descriptor.id,
          providerName: descriptor.name,
          resourceId: resource.id,
          resourceType: resource.type,
        },
      },
    ]);
  }

  assembleContext(
    request: EnterpriseContextProviderRequest,
  ): Promise<EnterpriseContextFragment | null> {
    const descriptor = this.describeContextProvider();
    const items = request.sourceData?.[descriptor.contextType];

    return Promise.resolve(
      items?.length
        ? {
            contextType: descriptor.contextType,
            items,
            providerId: descriptor.id,
          }
        : null,
    );
  }

  private getDefaultResourceId(
    resourceType: AiContextResourceType,
    request: AiContextSelectionRequest,
  ): string | undefined {
    if (resourceType === 'project') {
      return request.executionContext.projectId;
    }

    if (resourceType === 'workspace') {
      return request.executionContext.workspaceId;
    }

    return undefined;
  }
}

@Injectable()
export class ProjectContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'project',
      id: 'project-context',
      name: 'Project Context',
      priority: 10,
      sensitivity: 'medium',
      supportedResources: ['project'],
    });
  }
}

@Injectable()
export class TaskContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'task',
      id: 'task-context',
      name: 'Task Context',
      priority: 20,
      sensitivity: 'medium',
      supportedResources: ['task', 'project'],
    });
  }
}

@Injectable()
export class DocumentContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'document',
      id: 'document-context',
      name: 'Document Context',
      priority: 30,
      sensitivity: 'high',
      supportedResources: ['document', 'project', 'workspace'],
    });
  }
}

@Injectable()
export class RaidContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'raid',
      id: 'raid-context',
      name: 'RAID Context',
      priority: 40,
      sensitivity: 'high',
      supportedResources: ['raid', 'project'],
    });
  }
}

@Injectable()
export class TeamContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'team',
      id: 'team-context',
      name: 'Team Context',
      priority: 50,
      sensitivity: 'medium',
      supportedResources: ['team', 'project', 'workspace'],
    });
  }
}

@Injectable()
export class CalendarContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'calendar',
      id: 'calendar-context',
      name: 'Calendar Context',
      priority: 60,
      sensitivity: 'high',
      supportedResources: ['calendar', 'project', 'workspace'],
    });
  }
}

@Injectable()
export class PortfolioContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'portfolio',
      id: 'portfolio-context',
      name: 'Portfolio Context',
      priority: 70,
      sensitivity: 'medium',
      supportedResources: ['portfolio', 'workspace'],
    });
  }
}

@Injectable()
export class WorkspaceContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'workspace',
      id: 'workspace-context',
      name: 'Workspace Context',
      priority: 80,
      sensitivity: 'medium',
      supportedResources: ['workspace'],
    });
  }
}

@Injectable()
export class ExecutionContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'execution',
      id: 'execution-context',
      name: 'Execution Context',
      priority: 25,
      sensitivity: 'medium',
      supportedResources: ['execution', 'task', 'project'],
    });
  }
}

@Injectable()
export class UserContextProvider extends PlaceholderContextProvider {
  constructor() {
    super({
      contextType: 'user',
      id: 'user-context',
      name: 'User Context',
      priority: 90,
      sensitivity: 'high',
      supportedResources: ['user', 'workspace'],
    });
  }
}
