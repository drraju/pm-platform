import { Injectable } from '@nestjs/common';
import { AiExecutionCoordinator } from './ai-execution-coordinator.service';
import {
  AiExecutionRequest,
  AiExecutionResult,
} from './execution-engine.types';

@Injectable()
export class AiExecutionEngineService {
  constructor(private readonly coordinator: AiExecutionCoordinator) {}

  execute(input: AiExecutionRequest): Promise<AiExecutionResult> {
    return this.coordinator.coordinate(input);
  }
}
