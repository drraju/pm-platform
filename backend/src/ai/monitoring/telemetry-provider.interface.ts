export type AiTelemetryReference = {
  id: string;
};

export type AiTelemetryEvent = {
  correlationId: string;
  name: string;
  timestamp: string;
};

export interface TelemetryProvider {
  recordEvent(event: AiTelemetryEvent): Promise<AiTelemetryReference>;
}
