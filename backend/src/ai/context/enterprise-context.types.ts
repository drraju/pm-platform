import { AiScope, ExecutionContextMetadata } from '../common';
import {
  AiContextResourceType,
  AiContextSelectionRequest,
} from './context-provider.types';

export type EnterpriseContextProject = {
  description?: string | null;
  id: string;
  name: string;
  ownerId?: string | null;
  status: string;
};

export type EnterpriseContextPortfolio = {
  id: string;
  name: string;
  status?: string | null;
};

export type EnterpriseContextTask = {
  assigneeId?: string | null;
  dueDate?: string | null;
  id: string;
  percentComplete?: number | null;
  priority?: string | null;
  projectId: string;
  status: string;
  title: string;
};

export type EnterpriseContextExecutionUpdate = {
  id: string;
  nextStep?: string | null;
  projectId: string;
  status: string;
  taskId: string;
  updateNotes?: string | null;
  updatedOn?: string | null;
};

export type EnterpriseContextRaidItem = {
  id: string;
  projectId: string;
  severity?: string | null;
  status: string;
  title: string;
  type: string;
};

export type EnterpriseContextDocument = {
  documentType?: string | null;
  id: string;
  projectId: string;
  reviewStatus?: string | null;
  title: string;
  updatedAt?: string | null;
};

export type EnterpriseContextCalendar = {
  id: string;
  name: string;
  status?: string | null;
};

export type EnterpriseContextMember = {
  id: string;
  projectId: string;
  role: string;
  userId: string;
};

export type EnterpriseContextUser = {
  displayName?: string | null;
  email?: string | null;
  id: string;
  role?: string | null;
};

export type EnterpriseContextWorkspace = {
  currentFilters?: Readonly<Record<string, unknown>>;
  currentPage?: string | null;
  id: string;
  name?: string | null;
};

export type EnterpriseContext = {
  calendars: readonly EnterpriseContextCalendar[];
  documents: readonly EnterpriseContextDocument[];
  executionUpdates: readonly EnterpriseContextExecutionUpdate[];
  generatedAt: string;
  members: readonly EnterpriseContextMember[];
  portfolios: readonly EnterpriseContextPortfolio[];
  projects: readonly EnterpriseContextProject[];
  raidItems: readonly EnterpriseContextRaidItem[];
  tasks: readonly EnterpriseContextTask[];
  user: EnterpriseContextUser | null;
  workspace: EnterpriseContextWorkspace | null;
};

export type EnterpriseContextSourceData = {
  calendar?: readonly EnterpriseContextCalendar[];
  document?: readonly EnterpriseContextDocument[];
  execution?: readonly EnterpriseContextExecutionUpdate[];
  project?: readonly EnterpriseContextProject[];
  portfolio?: readonly EnterpriseContextPortfolio[];
  raid?: readonly EnterpriseContextRaidItem[];
  task?: readonly EnterpriseContextTask[];
  team?: readonly EnterpriseContextMember[];
  user?: readonly EnterpriseContextUser[];
  workspace?: readonly EnterpriseContextWorkspace[];
};

export type EnterpriseContextAuthorization = {
  allowedProjectIds?: readonly string[];
  allowedResourceIds?: Partial<
    Record<AiContextResourceType, readonly string[]>
  >;
  allowSensitiveContext?: boolean;
};

export type EnterpriseContextLimits = {
  calendars: number;
  documents: number;
  executionUpdates: number;
  members: number;
  projects: number;
  portfolios: number;
  raidItems: number;
  tasks: number;
  user: number;
  workspace: number;
};

export const defaultEnterpriseContextLimits: EnterpriseContextLimits = {
  calendars: 20,
  documents: 20,
  executionUpdates: 50,
  members: 50,
  projects: 20,
  portfolios: 20,
  raidItems: 50,
  tasks: 100,
  user: 1,
  workspace: 1,
};

export type EnterpriseContextAssemblyRequest = AiContextSelectionRequest & {
  authorization?: EnterpriseContextAuthorization;
  limits?: Partial<EnterpriseContextLimits>;
  sourceData?: EnterpriseContextSourceData;
};

export type EnterpriseContextProviderRequest = {
  executionContext: ExecutionContextMetadata;
  scope: AiScope;
  sourceData?: EnterpriseContextSourceData;
};

export type EnterpriseContextFragment = {
  contextType: AiContextResourceType;
  items: readonly unknown[];
  providerId: string;
};

export type EnterpriseContextAssemblyDiagnostics = {
  duplicateDetectionApplied: boolean;
  omittedItemCount: number;
  providerIds: readonly string[];
  truncatedTypes: readonly AiContextResourceType[];
};

export type EnterpriseContextAssemblyResult = {
  context: EnterpriseContext;
  diagnostics: EnterpriseContextAssemblyDiagnostics;
};
