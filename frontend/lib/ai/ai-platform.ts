import { ContextEngine } from "./context-engine";
import { ExecutionCoordinator } from "./execution-coordinator";
import { IntentEngine } from "./intent-engine";
import { PlanningEngine } from "./planning-engine";
import type {
  AIContextInput,
  AIIntentRequest,
  AIOrchestrationResult,
} from "./types";

export type AIPlatformOptions = {
  contextEngine?: ContextEngine;
  executionCoordinator?: ExecutionCoordinator;
  intentEngine?: IntentEngine;
  planningEngine?: PlanningEngine;
};

export class AIPlatform {
  private readonly contextEngine: ContextEngine;
  private readonly executionCoordinator: ExecutionCoordinator;
  private readonly intentEngine: IntentEngine;
  private readonly planningEngine: PlanningEngine;

  constructor({
    contextEngine = new ContextEngine(),
    executionCoordinator = new ExecutionCoordinator(),
    intentEngine = new IntentEngine(),
    planningEngine = new PlanningEngine(),
  }: AIPlatformOptions = {}) {
    this.contextEngine = contextEngine;
    this.executionCoordinator = executionCoordinator;
    this.intentEngine = intentEngine;
    this.planningEngine = planningEngine;
  }

  orchestrate(
    request: AIIntentRequest,
    contextInput: AIContextInput,
  ): AIOrchestrationResult {
    const intent = this.intentEngine.classify(request);
    const context = this.contextEngine.createContext(contextInput);
    const plan = this.planningEngine.createPlan(intent, context);

    return this.executionCoordinator.coordinate(plan);
  }
}
