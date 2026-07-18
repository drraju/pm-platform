import type { AIIntent, AIIntentRequest } from "./types";

export class IntentEngine {
  classify(request: AIIntentRequest): AIIntent {
    return createImmutableIntent(request);
  }
}

export function createImmutableIntent(request: AIIntentRequest): AIIntent {
  const input = request.input.trim();
  const category = input && request.category ? request.category : "Unknown";
  const intent: AIIntent = {
    category,
    ...(request.commandId ? { commandId: request.commandId } : {}),
    ...(request.entityId ? { entityId: request.entityId } : {}),
    input,
    ...(request.navigationTarget
      ? { navigationTarget: request.navigationTarget }
      : {}),
    ...(category === "Unknown"
      ? {
          reason: input
            ? "No intent category was supplied."
            : "No intent input was supplied.",
        }
      : {}),
  };

  return Object.freeze(intent);
}
