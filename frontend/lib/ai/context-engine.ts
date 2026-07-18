import type {
  AICommandReference,
  AIContext,
  AIContextInput,
  AIEntityReference,
} from "./types";

export class ContextEngine {
  createContext(input: AIContextInput): AIContext {
    return snapshotAIContext(input);
  }
}

export function snapshotAIContext(input: AIContextInput): AIContext {
  const availableCommands = Object.freeze(
    (input.availableCommands ?? []).map(copyCommand),
  );
  const availableEntities = Object.freeze(
    (input.availableEntities ?? []).map(copyEntity),
  );

  return Object.freeze({
    availableCommands,
    availableEntities,
    currentRoute: input.currentRoute,
    currentWorkspace: input.currentWorkspace,
    permissions: Object.freeze([...(input.permissions ?? [])]),
    selectedEntity: input.selectedEntity
      ? Object.freeze({ ...input.selectedEntity })
      : undefined,
    selectedProject: input.selectedProject
      ? Object.freeze({ ...input.selectedProject })
      : undefined,
  });
}

function copyCommand(command: AICommandReference): AICommandReference {
  return Object.freeze({ ...command });
}

function copyEntity(entity: AIEntityReference): AIEntityReference {
  return Object.freeze({ ...entity });
}
