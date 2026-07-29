import {
  AiContextMetadata,
  AiContextProviderDescriptor,
  AiContextSelectionRequest,
} from './context-provider.types';

export interface ContextProvider {
  describeContextProvider(): AiContextProviderDescriptor;
  selectContext(
    request: AiContextSelectionRequest,
  ): Promise<readonly AiContextMetadata[]>;
}
