import { AIEventBusService } from './ai-event-bus.service';
import { AIEvent, AIEventHandler } from './ai-event.types';

describe('AIEventBusService', () => {
  const createEvent = (): AIEvent => ({
    eventId: 'event-1',
    metadata: {
      requestId: 'req-1',
    },
    name: 'PipelineStarted',
    occurredAt: '2026-07-29T00:00:00.000Z',
    source: 'ai-test',
  });

  it('subscribes handlers, publishes events, and records diagnostics', async () => {
    const bus = new AIEventBusService();
    const handledEvents: AIEvent[] = [];
    const handler: AIEventHandler = {
      handle: (event) => {
        handledEvents.push(event);
        return Promise.resolve({ handled: true });
      },
      supports: (eventName) => eventName === 'PipelineStarted',
    };

    bus.subscribe(handler, {
      enabled: true,
      eventName: 'PipelineStarted',
      handlerId: 'pipeline-handler',
      name: 'Pipeline Handler',
      priority: 10,
      version: '1.0.0',
    });

    const result = await bus.publish(createEvent());

    expect(result.deliveredHandlerIds).toEqual(['pipeline-handler']);
    expect(handledEvents).toHaveLength(1);
    expect(bus.getDiagnostics()).toMatchObject({
      enabledHandlerIds: ['pipeline-handler'],
      eventCount: 1,
      handlerCount: 1,
      lastPublishedEventName: 'PipelineStarted',
    });
  });

  it('supports unsubscribe and disabled handler diagnostics', async () => {
    const bus = new AIEventBusService();
    const handler: AIEventHandler = {
      handle: () => Promise.resolve({ handled: true }),
      supports: () => true,
    };

    bus.subscribe(handler, {
      enabled: false,
      eventName: 'PipelineStarted',
      handlerId: 'disabled-handler',
      name: 'Disabled Handler',
      priority: 10,
      version: '1.0.0',
    });

    const result = await bus.publish(createEvent());

    expect(result.deliveredHandlerIds).toEqual([]);
    expect(result.skippedHandlerIds).toEqual(['disabled-handler']);
    expect(bus.getDiagnostics().disabledHandlerIds).toEqual([
      'disabled-handler',
    ]);
    expect(bus.unsubscribe('disabled-handler')).toBe(true);
    expect(bus.getDiagnostics().handlerCount).toBe(0);
  });

  it('respects configuration-backed handler enablement', async () => {
    process.env.AI_EVENT_HANDLER_FLAGGED_HANDLER_ENABLED = 'false';
    const bus = new AIEventBusService();
    const handler: AIEventHandler = {
      handle: () => Promise.resolve({ handled: true }),
      supports: () => true,
    };

    bus.subscribe(handler, {
      enabled: true,
      eventName: 'PipelineStarted',
      handlerId: 'flagged-handler',
      name: 'Flagged Handler',
      priority: 10,
      version: '1.0.0',
    });

    const result = await bus.publish(createEvent());

    expect(result.deliveredHandlerIds).toEqual([]);
    expect(result.skippedHandlerIds).toEqual(['flagged-handler']);
    expect(bus.getDiagnostics()).toMatchObject({
      disabledHandlerIds: ['flagged-handler'],
      enabledHandlerIds: [],
    });
    delete process.env.AI_EVENT_HANDLER_FLAGGED_HANDLER_ENABLED;
  });
});
