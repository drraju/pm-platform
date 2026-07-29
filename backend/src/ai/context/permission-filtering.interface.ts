import {
  AiContextPermissionFilterRequest,
  AiContextPermissionFilterResult,
} from './context-provider.types';

export interface AiContextPermissionFilter {
  filter(
    request: AiContextPermissionFilterRequest,
  ): Promise<AiContextPermissionFilterResult>;
}

export interface AiTenantIsolationPolicy {
  validateTenantBoundary(
    request: AiContextPermissionFilterRequest,
  ): Promise<AiContextPermissionFilterResult>;
}

export interface AiWorkspaceIsolationPolicy {
  validateWorkspaceBoundary(
    request: AiContextPermissionFilterRequest,
  ): Promise<AiContextPermissionFilterResult>;
}

export interface AiProjectIsolationPolicy {
  validateProjectBoundary(
    request: AiContextPermissionFilterRequest,
  ): Promise<AiContextPermissionFilterResult>;
}

export interface AiSecurityTrimmingPolicy {
  trim(
    request: AiContextPermissionFilterRequest,
  ): Promise<AiContextPermissionFilterResult>;
}
