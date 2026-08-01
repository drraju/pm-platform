import { Injectable } from '@nestjs/common';
import {
  PromptCompositionRequest,
  PromptCompositionResult,
  PromptModel,
  PromptResponseFormat,
  PromptSection,
  PromptSectionType,
} from './prompt-composition.types';

const defaultPromptTokenBudget = 4_000;

@Injectable()
export class PromptCompositionService {
  compose(request: PromptCompositionRequest): PromptCompositionResult {
    const tokenBudget = request.maxTokens ?? defaultPromptTokenBudget;
    const allSections = this.createSections(request);
    const selectedSections: PromptSection[] = [];
    let remaining = tokenBudget;

    for (const section of allSections) {
      if (remaining <= 0) break;
      const tokenEstimate = Math.min(section.tokenEstimate, remaining);
      if (tokenEstimate === 0) continue;
      selectedSections.push({
        ...section,
        content: this.truncateToTokens(section.content, tokenEstimate),
        tokenEstimate,
      });
      remaining -= tokenEstimate;
    }

    const selectedIds = new Set(selectedSections.map((section) => section.id));
    const prompt = this.toPromptModel(selectedSections, request.capabilityId);
    return {
      diagnostics: {
        omittedSectionIds: allSections
          .filter((section) => !selectedIds.has(section.id))
          .map((section) => section.id),
        tokenBudget,
        tokenEstimate: selectedSections.reduce(
          (total, section) => total + section.tokenEstimate,
          0,
        ),
      },
      prompt,
    };
  }

  private createSections(request: PromptCompositionRequest): PromptSection[] {
    const context = request.enterpriseContext;
    const sections: PromptSection[] = [
      this.section('system', 'system', 100, 'You are an assistant for enterprise project management.'),
      this.section('user-intent', 'user-intent', 90, this.toText(request.input)),
    ];
    const contextSections: Array<{
      content: unknown;
      id: string;
      priority: number;
      type: PromptSectionType;
    }> = [
      { content: context?.workspace, id: 'workspace', priority: 70, type: 'workspace' },
      { content: context?.projects, id: 'projects', priority: 65, type: 'project' },
      { content: context?.executionUpdates, id: 'execution', priority: 60, type: 'execution' },
      { content: context?.tasks, id: 'tasks', priority: 55, type: 'task' },
      { content: context?.raidItems, id: 'raid', priority: 50, type: 'raid' },
      { content: context?.documents, id: 'documents', priority: 45, type: 'document' },
    ];
    for (const item of contextSections) {
      const content = this.toContextText(item.content);
      if (content) sections.push(this.section(item.id, item.type, item.priority, content));
    }

    const metadata = request.input && typeof request.input === 'object'
      ? request.input as { constraints?: unknown; instructions?: unknown; responseFormat?: PromptResponseFormat }
      : {};
    const constraints = this.toText(metadata.constraints);
    const instructions = this.toText(metadata.instructions);
    if (constraints) sections.push(this.section('constraints', 'constraints', 40, constraints));
    if (instructions) sections.push(this.section('instructions', 'instructions', 35, instructions));
    const responseFormat = request.responseFormat ?? metadata.responseFormat;
    if (responseFormat) {
      sections.push(this.section('response-format', 'response-format', 30, this.responseFormatText(responseFormat)));
    }
    return sections;
  }

  private toPromptModel(sections: PromptSection[], capabilityId: string): PromptModel {
    const byType = (type: PromptSectionType) => sections.find((section) => section.type === type) ?? null;
    return {
      developerPrompt: byType('instructions'),
      metadata: { capabilityId, compositionVersion: '1.0.0' },
      providerHints: { deterministic: true },
      sections,
      systemPrompt: byType('system'),
      userPrompt: byType('user-intent'),
    };
  }

  private section(id: string, type: PromptSectionType, priority: number, content: string): PromptSection {
    return { content, id, priority, tokenEstimate: this.estimateTokens(content), type };
  }

  private toContextText(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value) && value.length === 0) return '';
    return JSON.stringify(value);
  }

  private toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value === undefined || value === null) return '';
    return JSON.stringify(value);
  }

  private estimateTokens(content: string): number {
    return Math.max(1, Math.ceil(content.length / 4));
  }

  private truncateToTokens(content: string, tokens: number): string {
    return content.length <= tokens * 4 ? content : content.slice(0, tokens * 4);
  }

  private responseFormatText(format: PromptResponseFormat): string {
    return `Respond using ${format}.`;
  }
}
