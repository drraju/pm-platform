# M15 Structured AI Response Framework

## Repository Investigation

M14 returned provider execution content and metadata through `AiExecutionResult`, but the content remained free-form. Provider adapters already returned a common execution result shape, making the post-provider normalization boundary the smallest compatible integration point.

## Architecture

`AiResponseNormalizationService` accepts the provider-independent execution result fields, parses recognized structured sections, ignores unknown fields, preserves raw content, and returns `StructuredAIResponse`. Provider routing and adapters remain unchanged.

## Response Model

The response model supports optional summary, findings, recommendations, action items, risks, warnings, opportunities, confidence, metadata, raw content, and parser diagnostics. Confidence is retained only when the provider supplies one of the supported values.

## Normalization

Valid JSON objects are normalized field-by-field with typed required properties for individual findings, recommendations, action items, and risks. Invalid items are ignored without discarding valid items. Plain text or malformed JSON gracefully becomes an `AI Response` summary with a parser warning.

## Provider Integration

The execution coordinator validates provider response metadata, then invokes the normalization service. The normalized response is returned in `AiExecutionResult.structuredResponse`; provider routing, provider adapters, and prompt composition are not duplicated or modified.

## Frontend Contract

Frontend consumers can use `StructuredAIResponse` instead of parsing raw markdown. Raw content remains available for diagnostics and debugging.

## Files Changed

- `backend/src/ai/responses/structured-ai-response.types.ts`
- `backend/src/ai/responses/ai-response-normalization.service.ts`
- `backend/src/ai/responses/ai-response-normalization.service.spec.ts`
- `backend/src/ai/responses/index.ts`
- `backend/src/ai/execution/execution-engine.types.ts`
- `backend/src/ai/execution/ai-execution-coordinator.service.ts`
- `backend/src/ai/ai.module.ts`

## Testing

Tests cover structured summaries, findings, recommendations, action items, risks, confidence handling, unknown fields, malformed section items, plain-text fallback, provider-independent execution, and existing Playground compatibility.

## Future Extension Points

Future work can add provider-specific parsers behind the same normalization contract, schema-versioned response formats, frontend DTO exposure, and structured output validation for capabilities that require strict schemas. Reasoning, agents, streaming, RAG, memory, and tool execution remain out of scope.
