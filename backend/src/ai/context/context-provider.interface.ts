import {
  AiContextMetadata,
  AiContextProviderDescriptor,
  AiContextSelectionRequest,
} from './context-provider.types';
import {
  EnterpriseContextFragment,
  EnterpriseContextProviderRequest,
} from './enterprise-context.types';

export interface ContextProvider {
  describeContextProvider(): AiContextProviderDescriptor;
  selectContext(
    request: AiContextSelectionRequest,
  ): Promise<readonly AiContextMetadata[]>;
  assembleContext?(
    request: EnterpriseContextProviderRequest,
  ): Promise<EnterpriseContextFragment | null>;
}
