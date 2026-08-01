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
    authorizationRules: {
      allowSensitiveContext: false,
      requiredPermissions: ['project.read'],
    },
    category: 'project-delivery',
    contextRequirements: {
      optional: ['document', 'calendar'],
      required: ['project', 'task', 'execution', 'raid', 'team', 'workspace', 'user'],
    },
    dependencies: createDependencies({
      capabilities: [{ capabilityId: 'chat', requiredness: 'required' }],
      contextTypes: [
        { contextType: 'project', requiredness: 'required' },
        { contextType: 'task', requiredness: 'required' },
        { contextType: 'execution', requiredness: 'required' },
        { contextType: 'raid', requiredness: 'required' },
        { contextType: 'team', requiredness: 'required' },
        { contextType: 'workspace', requiredness: 'required' },
        { contextType: 'user', requiredness: 'required' },
      ],
      promptCategories: [{ category: 'assistant', requiredness: 'required' }],
      providerFeatures: [{ feature: 'chat', requiredness: 'required' }],
    }),
    description: 'Analyzes project execution context for a structured daily review.',
    displayName: 'Daily Review Analysis',
    id: 'daily-review-analysis',
    lifecycleStatus: 'active',
    name: 'Daily Review Analysis',
    owner: 'ai-platform',
    priority: 5,
    requiredCapabilities: ['chat'],
    requiredPromptCategories: ['assistant'],
    requiredProviderFeatures: ['chat'],
    securityClassification: 'internal',
    supportedContextTypes: ['project', 'task', 'execution', 'raid', 'team', 'workspace', 'user'],
    supportedResponseFormats: ['markdown', 'json', 'executive-summary', 'bullet-summary'],
    version: '1.0.0',
  },
  {
    authorizationRules: {
      allowSensitiveContext: false,
      requiredPermissions: ['project.read'],
    },
    category: 'project-delivery',
    contextRequirements: {
      optional: ['task'],
      required: ['project', 'workspace'],
    },
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
    displayName: 'Project Delivery Assistant',
    owner: 'ai-platform',
    priority: 10,
    requiredCapabilities: ['chat'],
    requiredPromptCategories: ['assistant'],
    requiredProviderFeatures: ['chat'],
    securityClassification: 'internal',
    supportedResponseFormats: ['plain-text', 'markdown', 'bullet-summary'],
    supportedContextTypes: ['project', 'task', 'workspace'],
    version: '1.0.0',
  },
  {
    authorizationRules: {
      allowSensitiveContext: false,
      requiredPermissions: ['project.read', 'raid.read'],
    },
    category: 'raid',
    contextRequirements: {
      optional: ['document', 'calendar'],
      required: ['project', 'raid'],
    },
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
    displayName: 'RAID Analysis Assistant',
    owner: 'ai-platform',
    priority: 20,
    requiredCapabilities: ['reasoning'],
    requiredPromptCategories: ['analysis'],
    requiredProviderFeatures: ['reasoning'],
    securityClassification: 'confidential',
    supportedResponseFormats: ['plain-text', 'markdown', 'bullet-summary'],
    supportedContextTypes: ['raid', 'project'],
    version: '1.0.0',
  },
  {
    authorizationRules: {
      allowSensitiveContext: false,
      requiredPermissions: ['portfolio.read'],
    },
    category: 'portfolio',
    contextRequirements: {
      optional: ['project'],
      required: ['portfolio', 'workspace'],
    },
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
    displayName: 'Portfolio Status Assistant',
    owner: 'ai-platform',
    priority: 30,
    requiredCapabilities: ['structured-output'],
    requiredPromptCategories: ['generation'],
    requiredProviderFeatures: ['structured-output'],
    securityClassification: 'internal',
    supportedResponseFormats: ['markdown', 'json', 'executive-summary'],
    supportedContextTypes: ['portfolio', 'workspace'],
    version: '1.0.0',
  },
];
