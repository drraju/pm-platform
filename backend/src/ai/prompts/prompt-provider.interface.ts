export type PromptTemplateDescriptor = {
  capabilityId: string;
  id: string;
  lifecycleState: 'draft' | 'review' | 'approved' | 'deprecated' | 'retired';
  requiredVariables: string[];
  version: string;
};

export type PromptPayload = {
  content: string;
  metadata?: Record<string, unknown>;
  templateId: string;
  version: string;
};

export interface PromptProvider {
  resolveTemplate(
    capabilityId: string,
  ): Promise<PromptTemplateDescriptor | null>;
  validateTemplate(template: PromptTemplateDescriptor): Promise<boolean>;
}
