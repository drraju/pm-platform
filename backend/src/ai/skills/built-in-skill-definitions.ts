import {
  AiSkillDependencyMetadata,
  AiSkillMetadata,
} from './skill-platform.types';

const emptyFutureDependencies = {
  futureAgentDependencies: [],
  futureSkillDependencies: [],
};

const createDependencies = (
  input: Pick<
    AiSkillDependencyMetadata,
    'capabilities' | 'contextTypes' | 'promptCategories' | 'providerFeatures'
  >,
): AiSkillDependencyMetadata => ({
  ...input,
  ...emptyFutureDependencies,
});

export const builtInSkillDefinitions: AiSkillMetadata[] = [
  {
    category: 'project-delivery',
    dependencies: createDependencies({
      capabilities: [{ capabilityId: 'chat', requiredness: 'required' }],
      contextTypes: [
        { contextType: 'project', requiredness: 'required' },
        { contextType: 'task', requiredness: 'optional' },
        { contextType: 'workspace', requiredness: 'required' },
      ],
      promptCategories: [{ category: 'assistant', requiredness: 'required' }],
      providerFeatures: [{ feature: 'chat', requiredness: 'required' }],
    }),
    description: 'Metadata contract for future project delivery assistance.',
    id: 'project-delivery-assistant',
    lifecycleStatus: 'draft',
    name: 'Project Delivery Assistant',
    owner: 'ai-platform',
    priority: 10,
    requiredCapabilities: ['chat'],
    requiredPromptCategories: ['assistant'],
    requiredProviderFeatures: ['chat'],
    securityClassification: 'internal',
    supportedContextTypes: ['project', 'task', 'workspace'],
    version: '1.0.0',
  },
  {
    category: 'raid',
    dependencies: createDependencies({
      capabilities: [{ capabilityId: 'reasoning', requiredness: 'required' }],
      contextTypes: [
        { contextType: 'raid', requiredness: 'required' },
        { contextType: 'project', requiredness: 'required' },
      ],
      promptCategories: [{ category: 'analysis', requiredness: 'required' }],
      providerFeatures: [{ feature: 'reasoning', requiredness: 'required' }],
    }),
    description: 'Metadata contract for future RAID analysis assistance.',
    id: 'raid-analysis-assistant',
    lifecycleStatus: 'draft',
    name: 'RAID Analysis Assistant',
    owner: 'ai-platform',
    priority: 20,
    requiredCapabilities: ['reasoning'],
    requiredPromptCategories: ['analysis'],
    requiredProviderFeatures: ['reasoning'],
    securityClassification: 'confidential',
    supportedContextTypes: ['raid', 'project'],
    version: '1.0.0',
  },
  {
    category: 'portfolio',
    dependencies: createDependencies({
      capabilities: [
        { capabilityId: 'structured-output', requiredness: 'required' },
      ],
      contextTypes: [
        { contextType: 'portfolio', requiredness: 'required' },
        { contextType: 'workspace', requiredness: 'required' },
      ],
      promptCategories: [{ category: 'generation', requiredness: 'required' }],
      providerFeatures: [
        { feature: 'structured-output', requiredness: 'required' },
      ],
    }),
    description: 'Metadata contract for future portfolio status assistance.',
    id: 'portfolio-status-assistant',
    lifecycleStatus: 'draft',
    name: 'Portfolio Status Assistant',
    owner: 'ai-platform',
    priority: 30,
    requiredCapabilities: ['structured-output'],
    requiredPromptCategories: ['generation'],
    requiredProviderFeatures: ['structured-output'],
    securityClassification: 'internal',
    supportedContextTypes: ['portfolio', 'workspace'],
    version: '1.0.0',
  },
];
