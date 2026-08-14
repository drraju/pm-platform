import { Injectable } from '@nestjs/common';
import { AiContextRegistryService } from './ai-context-registry.service';
import {
  AiContextResourceType,
  AiContextSelectionRequest,
} from './context-provider.types';
import {
  defaultEnterpriseContextLimits,
  EnterpriseContext,
  EnterpriseContextAssemblyRequest,
  EnterpriseContextAssemblyResult,
  EnterpriseContextFragment,
} from './enterprise-context.types';

const sensitiveTypes = new Set<AiContextResourceType>([
  'calendar',
  'document',
  'raid',
]);
const projectBoundTypes = new Set<AiContextResourceType>([
  'document',
  'execution',
  'project',
  'raid',
  'task',
  'team',
]);

@Injectable()
export class EnterpriseContextAssemblyService {
  constructor(private readonly registry: AiContextRegistryService) {}

  async assemble(
    request: EnterpriseContextAssemblyRequest,
  ): Promise<EnterpriseContextAssemblyResult> {
    const selections = await this.registry.assembleContext(request);
    const fragments = selections
      .map((selection) => selection.fragment)
      .filter((fragment): fragment is EnterpriseContextFragment => Boolean(fragment));
    const limits = {
      ...defaultEnterpriseContextLimits,
      ...(request.limits ?? {}),
    };
    const buckets = this.createBuckets();
    let omittedItemCount = 0;
    let duplicateDetectionApplied = false;
    const truncatedTypes = new Set<AiContextResourceType>();

    for (const fragment of fragments) {
      for (const item of fragment.items) {
        const normalized = this.normalizeItem(item);
        if (!normalized || !this.isAuthorized(fragment.contextType, normalized, request)) {
          omittedItemCount += 1;
          continue;
        }

        const bucket = this.getBucket(buckets, fragment.contextType);
        if (bucket.some((candidate) => candidate.id === normalized.id)) {
          duplicateDetectionApplied = true;
          continue;
        }
        bucket.push(normalized);
      }
    }

    for (const [type, bucket] of Object.entries(buckets) as [
      keyof typeof buckets,
      NormalizedContextItem[],
    ][]) {
      bucket.sort((left, right) => left.id.localeCompare(right.id));
      const limit = limits[this.toLimitKey(type)];
      if (bucket.length > limit) {
        omittedItemCount += bucket.length - limit;
        bucket.splice(limit);
        truncatedTypes.add(type);
      }
    }

    const generatedAt = request.executionContext.timestamp;
    return {
      context: {
        calendars: buckets.calendar.map((item) => item.value) as EnterpriseContext['calendars'],
        documents: buckets.document.map((item) => item.value) as EnterpriseContext['documents'],
        executionUpdates: buckets.execution.map((item) => item.value) as EnterpriseContext['executionUpdates'],
        generatedAt,
        members: buckets.team.map((item) => item.value) as EnterpriseContext['members'],
        portfolios: buckets.portfolio.map((item) => item.value) as EnterpriseContext['portfolios'],
        projects: buckets.project.map((item) => item.value) as EnterpriseContext['projects'],
        raidItems: buckets.raid.map((item) => item.value) as EnterpriseContext['raidItems'],
        tasks: buckets.task.map((item) => item.value) as EnterpriseContext['tasks'],
        user: (buckets.user[0]?.value as EnterpriseContext['user']) ?? null,
        workspace: (buckets.workspace[0]?.value as EnterpriseContext['workspace']) ?? null,
      },
      diagnostics: {
        duplicateDetectionApplied,
        omittedItemCount,
        providerIds: selections.map((selection) => selection.provider.id),
        truncatedTypes: [...truncatedTypes],
      },
    };
  }

  private createBuckets(): Record<AiContextResourceType, NormalizedContextItem[]> {
    return {
      calendar: [],
      document: [],
      execution: [],
      project: [],
      portfolio: [],
      raid: [],
      task: [],
      team: [],
      user: [],
      workspace: [],
    };
  }

  private getBucket(
    buckets: Record<AiContextResourceType, NormalizedContextItem[]>,
    type: AiContextResourceType,
  ) {
    return buckets[type];
  }

  private normalizeItem(item: unknown): NormalizedContextItem | null {
    if (!item || typeof item !== 'object' || !('id' in item)) {
      return null;
    }
    const candidate = item as { id?: unknown; projectId?: unknown };
    return typeof candidate.id === 'string'
      ? {
          id: candidate.id,
          projectId:
            typeof candidate.projectId === 'string'
              ? candidate.projectId
              : undefined,
          value: item,
        }
      : null;
  }

  private isAuthorized(
    type: AiContextResourceType,
    item: NormalizedContextItem,
    request: EnterpriseContextAssemblyRequest,
  ) {
    const authorization = request.authorization;
    if (!authorization) {
      return false;
    }
    if (request.scope.projectIds?.length) {
      const scopedProjectId =
        type === 'project' ? item.id : item.projectId;
      if (scopedProjectId && !request.scope.projectIds.includes(scopedProjectId)) {
        return false;
      }
    }
    if (
      authorization.allowSensitiveContext === false &&
      sensitiveTypes.has(type)
    ) {
      return false;
    }
    if (projectBoundTypes.has(type)) {
      const projectId = type === 'project' ? item.id : item.projectId;
      if (!projectId || !authorization.allowedProjectIds?.includes(projectId)) {
        return false;
      }
    }
    const allowedResourceIds = authorization.allowedResourceIds?.[type];
    return !allowedResourceIds || allowedResourceIds.includes(item.id);
  }

  private toLimitKey(type: AiContextResourceType): keyof typeof defaultEnterpriseContextLimits {
    return type === 'execution'
      ? 'executionUpdates'
      : type === 'document'
        ? 'documents'
        : type === 'raid'
          ? 'raidItems'
          : type === 'team'
            ? 'members'
            : `${type}s` as keyof typeof defaultEnterpriseContextLimits;
  }
}

type NormalizedContextItem = {
  id: string;
  projectId?: string;
  value: unknown;
};
