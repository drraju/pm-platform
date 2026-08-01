export type AiIntentId =
  | 'PROJECT_SUMMARY'
  | 'EXECUTION_REVIEW'
  | 'DAILY_BRIEF'
  | 'RISK_REVIEW'
  | 'TASK_ANALYSIS'
  | (string & {});

/** Explicit intent selection; this is metadata, not NLP. */
export type AiIntent = {
  id: AiIntentId;
  parameters?: Readonly<Record<string, unknown>>;
  skillId: string;
};

export type AiIntentValidationResult = {
  errors: readonly string[];
  valid: boolean;
};
