import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExternalApiGuard } from '../auth/external-api.guard';
import { ExternalV1Controller } from '../external-v1.controller';
import { ExternalReadQueryService } from '../external-read-query.service';
import { ExternalApiAccessLoggingGuard } from '../logging/external-api-access-logging.guard';

const externalEndpoints = [
  ['/external/v1/projects', 'ExternalProjectDto'],
  ['/external/v1/tasks', 'ExternalTaskDto'],
  ['/external/v1/risks', 'ExternalRiskDto'],
  ['/external/v1/issues', 'ExternalIssueDto'],
] as const;

type OpenApiSchema = {
  $ref?: string;
  allOf?: OpenApiSchema[];
  enum?: Array<number | string>;
  example?: unknown;
  format?: string;
  items?: OpenApiSchema;
  nullable?: boolean;
  oneOf?: OpenApiSchema[];
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  type?: string;
};

type OpenApiParameter = {
  $ref?: string;
  in?: string;
  name?: string;
  required?: boolean;
  schema?: OpenApiSchema;
};

type OpenApiResponse = {
  $ref?: string;
  content?: Record<string, { schema?: OpenApiSchema }>;
};

type OpenApiOperation = {
  parameters?: OpenApiParameter[];
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
};

type GeneratedOpenApiDocument = {
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, unknown>;
  };
  paths: Record<string, { get?: OpenApiOperation }>;
};

describe('external v1 OpenAPI contract', () => {
  let app: INestApplication;
  let document: GeneratedOpenApiDocument;

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ExternalV1Controller],
      providers: [
        {
          provide: ExternalReadQueryService,
          useValue: {
            findIssues: jest.fn(),
            findProjects: jest.fn(),
            findRisks: jest.fn(),
            findTasks: jest.fn(),
          },
        },
      ],
    });
    moduleBuilder
      .overrideGuard(ExternalApiAccessLoggingGuard)
      .useValue({ canActivate: () => true });
    moduleBuilder
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true });
    moduleBuilder
      .overrideGuard(ExternalApiGuard)
      .useValue({ canActivate: () => true });
    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('PM Platform API')
        .setDescription('Enterprise project management platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    ) as unknown as GeneratedOpenApiDocument;
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents exactly the four approved GET paths with bearer security', () => {
    expect(document.components?.securitySchemes?.bearer).toEqual({
      bearerFormat: 'JWT',
      scheme: 'bearer',
      type: 'http',
    });

    for (const [path] of externalEndpoints) {
      expect(Object.keys(document.paths[path] ?? {})).toEqual(['get']);
      expect(operation(path).security).toEqual([{ bearer: [] }]);
    }
  });

  it.each(externalEndpoints)(
    'documents %s with its resource-specific page response',
    (path, itemSchemaName) => {
      const externalOperation = operation(path);
      expect(Object.keys(externalOperation.responses).sort()).toEqual([
        '200',
        '400',
        '401',
        '403',
      ]);
      expect(responseSchema(externalOperation, '200')).toEqual({
        allOf: [
          { $ref: '#/components/schemas/ExternalPageDto' },
          {
            properties: {
              data: {
                items: {
                  $ref: `#/components/schemas/${itemSchemaName}`,
                },
                type: 'array',
              },
            },
            type: 'object',
          },
        ],
      });
      expect(responseSchema(externalOperation, '400')).toEqual({
        $ref: '#/components/schemas/ExternalBadRequestErrorDto',
      });
      expect(responseSchema(externalOperation, '401')).toEqual({
        $ref: '#/components/schemas/ExternalUnauthorizedErrorDto',
      });
      expect(responseSchema(externalOperation, '403')).toEqual({
        $ref: '#/components/schemas/ExternalForbiddenErrorDto',
      });
    },
  );

  it.each(externalEndpoints)(
    'documents the extraction query parameters for %s',
    (path) => {
      const externalOperation = operation(path);
      expect(queryParameter(externalOperation, 'cursor')).toEqual(
        expect.objectContaining({
          in: 'query',
          required: false,
          schema: { type: 'string' },
        }),
      );
      expect(queryParameter(externalOperation, 'limit')).toEqual(
        expect.objectContaining({
          in: 'query',
          required: false,
          schema: {
            default: 200,
            maximum: 1000,
            minimum: 1,
            type: 'integer',
          },
        }),
      );
      for (const name of ['updatedSince', 'snapshotAt']) {
        expect(queryParameter(externalOperation, name)).toEqual(
          expect.objectContaining({
            in: 'query',
            required: false,
            schema: { format: 'date-time', type: 'string' },
          }),
        );
      }
    },
  );

  it('documents the page metadata with stable scalar types', () => {
    const page = componentSchema('ExternalPageDto');
    expect(page.properties?.nextCursor).toEqual({
      nullable: true,
      type: 'string',
    });
    expect(page.properties?.snapshotAt).toEqual({
      format: 'date-time',
      type: 'string',
    });
    expect(page.required).toEqual(
      expect.arrayContaining(['data', 'nextCursor', 'snapshotAt']),
    );
  });

  it('documents resource identifiers, dates, and nullable scalars accurately', () => {
    expect(componentSchema('ExternalProjectDto').properties).toEqual(
      expect.objectContaining({
        id: { format: 'uuid', type: 'string' },
        startDate: { format: 'date', nullable: true, type: 'string' },
        targetEndDate: {
          format: 'date',
          nullable: true,
          type: 'string',
        },
      }),
    );

    expect(componentSchema('ExternalTaskDto').properties).toEqual(
      expect.objectContaining({
        actualEndDate: {
          format: 'date',
          nullable: true,
          type: 'string',
        },
        actualStartDate: {
          format: 'date',
          nullable: true,
          type: 'string',
        },
        dueDate: { format: 'date', nullable: true, type: 'string' },
        estimatedHours: { nullable: true, type: 'number' },
        id: { format: 'uuid', type: 'string' },
        milestoneCategory: { nullable: true, type: 'string' },
        parentTaskId: { format: 'uuid', nullable: true, type: 'string' },
        plannedEndDate: {
          format: 'date',
          nullable: true,
          type: 'string',
        },
        plannedStartDate: {
          format: 'date',
          nullable: true,
          type: 'string',
        },
        projectId: { format: 'uuid', type: 'string' },
        remainingHours: { nullable: true, type: 'number' },
        sequenceNumber: { nullable: true, type: 'integer' },
        startDate: { format: 'date', nullable: true, type: 'string' },
      }),
    );

    for (const schemaName of ['ExternalRiskDto', 'ExternalIssueDto']) {
      expect(componentSchema(schemaName).properties).toEqual(
        expect.objectContaining({
          id: { format: 'uuid', type: 'string' },
          projectId: { format: 'uuid', type: 'string' },
        }),
      );
    }
  });

  it('documents the actual status-specific error alternatives', () => {
    const badRequest = componentSchema('ExternalBadRequestErrorDto');
    expect(badRequest.properties?.message).toEqual({
      oneOf: [{ type: 'string' }, { items: { type: 'string' }, type: 'array' }],
    });
    expect(badRequest.properties?.error).toEqual({
      example: 'Bad Request',
      type: 'string',
    });
    expect(badRequest.properties?.statusCode).toEqual({
      enum: [400],
      example: 400,
      type: 'integer',
    });
    expect(badRequest.required).toEqual(['message', 'statusCode']);

    const unauthorized = componentSchema('ExternalUnauthorizedErrorDto');
    expect(unauthorized.properties).toEqual(
      expect.objectContaining({
        error: { example: 'Unauthorized', type: 'string' },
        message: { example: 'Unauthorized', type: 'string' },
        statusCode: { enum: [401], example: 401, type: 'integer' },
      }),
    );
    expect(unauthorized.required).toEqual(['message', 'statusCode']);

    const forbidden = componentSchema('ExternalForbiddenErrorDto');
    expect(forbidden.properties).toEqual({
      message: {
        example: 'External API access denied',
        type: 'string',
      },
      error: { example: 'Forbidden', type: 'string' },
      statusCode: { enum: [403], example: 403, type: 'integer' },
    });
    expect(forbidden.required).toEqual(['message', 'error', 'statusCode']);
  });

  function operation(path: string): OpenApiOperation {
    const externalOperation = document.paths[path]?.get;
    expect(externalOperation).toBeDefined();
    return externalOperation!;
  }

  function queryParameter(
    externalOperation: OpenApiOperation,
    name: string,
  ): OpenApiParameter {
    const parameter = externalOperation.parameters?.find(
      (candidate) => !candidate.$ref && candidate.name === name,
    );
    expect(parameter).toBeDefined();
    return parameter!;
  }

  function responseSchema(
    externalOperation: OpenApiOperation,
    status: string,
  ): OpenApiSchema {
    const response = externalOperation.responses[status];
    expect(response).toBeDefined();
    const schema = response.content?.['application/json']?.schema;
    expect(schema).toBeDefined();
    return schema!;
  }

  function componentSchema(name: string): OpenApiSchema {
    const schema = document.components?.schemas?.[name];
    expect(schema).toBeDefined();
    expect(schema?.$ref).toBeUndefined();
    return schema!;
  }
});
