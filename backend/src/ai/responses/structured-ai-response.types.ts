export type AiResponseSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AiResponsePriority = 'critical' | 'high' | 'medium' | 'low';
export type AiResponseConfidence = 'high' | 'medium' | 'low' | 'unknown';

export type StructuredAISummary = {
  businessImpact?: string;
  overview: string;
  title: string;
};

export type StructuredAIFinding = {
  category?: string;
  description: string;
  evidence?: readonly string[];
  severity?: AiResponseSeverity;
  title: string;
};

export type StructuredAIRecommendation = {
  description: string;
  priority?: AiResponsePriority;
  reason?: string;
  title: string;
};

export type StructuredAIActionItem = {
  description: string;
  owner?: string;
  priority?: AiResponsePriority;
  suggestedDueDate?: string;
};

export type StructuredAIRisk = {
  description: string;
  impact?: string;
  probability?: string;
  severity?: AiResponseSeverity;
  title: string;
};

export type StructuredAIResponseDiagnostics = {
  normalized: boolean;
  parserWarnings: readonly string[];
  unknownFields: readonly string[];
};

export type StructuredAIResponse = {
  actionItems?: readonly StructuredAIActionItem[];
  confidence?: AiResponseConfidence;
  diagnostics: StructuredAIResponseDiagnostics;
  findings?: readonly StructuredAIFinding[];
  metadata: Readonly<Record<string, unknown>>;
  opportunities?: readonly string[];
  rawContent?: string;
  recommendations?: readonly StructuredAIRecommendation[];
  risks?: readonly StructuredAIRisk[];
  summary?: StructuredAISummary;
  warnings?: readonly string[];
};

export type AiResponseParserInput = {
  content: string;
  modelId: string;
  providerId: string;
};
