import {
  AIEvent,
  AIEventDiagnostics,
  AIEventHandler,
  AIEventHandlerMetadata,
  AIEventName,
  AIEventPublishResult,
} from './ai-event.types';

export interface AIEventPublisher {
  publish(event: AIEvent): Promise<AIEventPublishResult>;
}

export interface AIEventSubscriber {
  subscribe(handler: AIEventHandler, metadata: AIEventHandlerMetadata): void;
  unsubscribe(handlerId: string): boolean;
}

export interface AIEventRegistry {
  findHandlers(eventName: AIEventName): readonly AIEventHandlerMetadata[];
  getDiagnostics(): AIEventDiagnostics;
}
