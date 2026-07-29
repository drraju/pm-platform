import { Injectable, Optional } from '@nestjs/common';
import { AiConfigService } from '../ai-config.service';
import {
  AIEventPublisher,
  AIEventRegistry,
  AIEventSubscriber,
} from './ai-event.interfaces';
import {
  AIEvent,
  AIEventDiagnostics,
  AIEventHandler,
  AIEventHandlerMetadata,
  AIEventName,
  AIEventPublishResult,
} from './ai-event.types';

type RegisteredAIEventHandler = {
  handler: AIEventHandler;
  metadata: AIEventHandlerMetadata;
};

@Injectable()
export class AIEventBusService
  implements AIEventPublisher, AIEventSubscriber, AIEventRegistry
{
  private readonly handlers = new Map<string, RegisteredAIEventHandler>();
  private readonly events: AIEvent[] = [];
  private eventCount = 0;
  private lastPublishedEventName?: AIEventName;
  private readonly configService: AiConfigService;

  constructor(@Optional() configService?: AiConfigService) {
    this.configService = configService ?? new AiConfigService();
  }

  findHandlers(eventName: AIEventName): readonly AIEventHandlerMetadata[] {
    return this.getOrderedHandlers()
      .filter(
        ({ handler, metadata }) =>
          metadata.enabled &&
          this.configService.isEventHandlerEnabled(metadata.handlerId) &&
          metadata.eventName === eventName &&
          handler.supports(eventName),
      )
      .map(({ metadata }) => metadata);
  }

  getDiagnostics(): AIEventDiagnostics {
    const handlers = this.getOrderedHandlers();

    return {
      disabledHandlerIds: handlers
        .filter(
          ({ metadata }) =>
            !metadata.enabled ||
            !this.configService.isEventHandlerEnabled(metadata.handlerId),
        )
        .map(({ metadata }) => metadata.handlerId),
      enabledHandlerIds: handlers
        .filter(
          ({ metadata }) =>
            metadata.enabled &&
            this.configService.isEventHandlerEnabled(metadata.handlerId),
        )
        .map(({ metadata }) => metadata.handlerId),
      eventCount: this.eventCount,
      handlerCount: handlers.length,
      lastPublishedEventName: this.lastPublishedEventName,
    };
  }

  getPublishedEvents(): readonly AIEvent[] {
    return Object.freeze(
      this.events.map((event) =>
        Object.freeze({
          ...event,
          metadata: Object.freeze({ ...event.metadata }),
        }),
      ),
    );
  }

  async publish(event: AIEvent): Promise<AIEventPublishResult> {
    this.eventCount += 1;
    this.lastPublishedEventName = event.name;
    this.events.push(event);

    const deliveredHandlerIds: string[] = [];
    const skippedHandlerIds: string[] = [];

    for (const { handler, metadata } of this.getOrderedHandlers()) {
      if (
        !metadata.enabled ||
        !this.configService.isEventHandlerEnabled(metadata.handlerId) ||
        metadata.eventName !== event.name ||
        !handler.supports(event.name)
      ) {
        skippedHandlerIds.push(metadata.handlerId);
        continue;
      }

      await handler.handle(event);
      deliveredHandlerIds.push(metadata.handlerId);
    }

    return {
      deliveredHandlerIds,
      event,
      skippedHandlerIds,
    };
  }

  subscribe(handler: AIEventHandler, metadata: AIEventHandlerMetadata): void {
    this.handlers.set(metadata.handlerId, {
      handler,
      metadata,
    });
  }

  unsubscribe(handlerId: string): boolean {
    return this.handlers.delete(handlerId);
  }

  private getOrderedHandlers(): RegisteredAIEventHandler[] {
    return [...this.handlers.values()].sort(
      (left, right) => left.metadata.priority - right.metadata.priority,
    );
  }
}
