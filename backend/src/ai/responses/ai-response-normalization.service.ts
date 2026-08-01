import { Injectable } from '@nestjs/common';
import {
  AiResponseConfidence,
  AiResponseParserInput,
  AiResponsePriority,
  AiResponseSeverity,
  StructuredAIActionItem,
  StructuredAIResponse,
  StructuredAIFinding,
  StructuredAIRecommendation,
  StructuredAIRisk,
} from './structured-ai-response.types';

const topLevelFields = new Set([
  'actionItems',
  'confidence',
  'findings',
  'metadata',
  'opportunities',
  'recommendations',
  'risks',
  'summary',
  'warnings',
]);

@Injectable()
export class AiResponseNormalizationService {
  normalize(input: AiResponseParserInput): StructuredAIResponse {
    const parsed = this.parseObject(input.content);
    if (!parsed) {
      return this.createFallback(input, 'Provider returned unstructured text.');
    }

    const unknownFields = Object.keys(parsed).filter(
      (field) => !topLevelFields.has(field),
    );
    const parserWarnings: string[] = [];
    const summary = this.normalizeSummary(parsed.summary);
    const findings = this.normalizeFindings(parsed.findings);
    const recommendations = this.normalizeRecommendations(parsed.recommendations);
    const actionItems = this.normalizeActionItems(parsed.actionItems);
    const risks = this.normalizeRisks(parsed.risks);
    const warnings = this.normalizeStrings(parsed.warnings);
    const opportunities = this.normalizeStrings(parsed.opportunities);
    const confidence = this.normalizeConfidence(parsed.confidence);

    if (!summary && !findings?.length && !recommendations?.length && !actionItems?.length && !risks?.length) {
      parserWarnings.push('Provider response contained no recognized structured sections.');
    }

    return {
      actionItems,
      confidence,
      diagnostics: {
        normalized: true,
        parserWarnings,
        unknownFields,
      },
      findings,
      metadata: {
        modelId: input.modelId,
        providerId: input.providerId,
        ...(this.isRecord(parsed.metadata) ? parsed.metadata : {}),
      },
      opportunities,
      rawContent: input.content,
      recommendations,
      risks,
      summary,
      warnings,
    };
  }

  private createFallback(
    input: AiResponseParserInput,
    warning: string,
  ): StructuredAIResponse {
    return {
      diagnostics: {
        normalized: false,
        parserWarnings: [warning],
        unknownFields: [],
      },
      metadata: {
        modelId: input.modelId,
        providerId: input.providerId,
      },
      rawContent: input.content,
      summary: {
        overview: input.content,
        title: 'AI Response',
      },
    };
  }

  private parseObject(content: string): Record<string, unknown> | null {
    try {
      const parsed: unknown = JSON.parse(content);
      return this.isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private normalizeSummary(value: unknown) {
    if (typeof value === 'string' && value.trim()) {
      return { overview: value, title: 'Summary' };
    }
    if (!this.isRecord(value)) return undefined;
    const overview = this.toString(value.overview ?? value.description);
    const title = this.toString(value.title);
    return overview && title ? { businessImpact: this.toString(value.businessImpact), overview, title } : undefined;
  }

  private normalizeFindings(value: unknown): StructuredAIFinding[] | undefined {
    return this.normalizeArray(value, (item) => {
      if (!this.isRecord(item)) return undefined;
      const title = this.toString(item.title);
      const description = this.toString(item.description);
      if (!title || !description) return undefined;
      return {
        category: this.toString(item.category),
        description,
        evidence: this.normalizeStrings(item.evidence),
        severity: this.normalizeEnum(item.severity, ['critical', 'high', 'medium', 'low', 'info']),
        title,
      };
    });
  }

  private normalizeRecommendations(value: unknown): StructuredAIRecommendation[] | undefined {
    return this.normalizeArray(value, (item) => {
      if (!this.isRecord(item)) return undefined;
      const title = this.toString(item.title);
      const description = this.toString(item.description);
      if (!title || !description) return undefined;
      return {
        description,
        priority: this.normalizeEnum(item.priority, ['critical', 'high', 'medium', 'low']),
        reason: this.toString(item.reason),
        title,
      };
    });
  }

  private normalizeActionItems(value: unknown): StructuredAIActionItem[] | undefined {
    return this.normalizeArray(value, (item) => {
      if (!this.isRecord(item)) return undefined;
      const description = this.toString(item.description);
      return description
        ? {
            description,
            owner: this.toString(item.owner),
            priority: this.normalizeEnum(item.priority, ['critical', 'high', 'medium', 'low']),
            suggestedDueDate: this.toString(item.suggestedDueDate),
          }
        : undefined;
    });
  }

  private normalizeRisks(value: unknown): StructuredAIRisk[] | undefined {
    return this.normalizeArray(value, (item) => {
      if (!this.isRecord(item)) return undefined;
      const title = this.toString(item.title);
      const description = this.toString(item.description);
      return title && description
        ? {
            description,
            impact: this.toString(item.impact),
            probability: this.toString(item.probability),
            severity: this.normalizeEnum(item.severity, ['critical', 'high', 'medium', 'low', 'info']),
            title,
          }
        : undefined;
    });
  }

  private normalizeArray<T>(value: unknown, mapper: (item: unknown) => T | undefined): T[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const normalized = value.map(mapper).filter((item): item is T => Boolean(item));
    return normalized.length ? normalized : undefined;
  }

  private normalizeStrings(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return normalized.length ? normalized : undefined;
  }

  private normalizeConfidence(value: unknown): AiResponseConfidence | undefined {
    return this.normalizeEnum(value, ['high', 'medium', 'low', 'unknown']);
  }

  private normalizeEnum<T extends string>(value: unknown, values: readonly T[]): T | undefined {
    return typeof value === 'string' && values.includes(value as T) ? (value as T) : undefined;
  }

  private toString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
