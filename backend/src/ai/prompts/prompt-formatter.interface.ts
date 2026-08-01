import { PromptModel } from './prompt-composition.types';

export interface PromptFormatter<TFormatted = unknown> {
  readonly providerId: string;
  format(prompt: PromptModel): TFormatted;
}
