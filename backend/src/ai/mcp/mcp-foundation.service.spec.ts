import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { AIEventBusService, AI_MCP_TOOLS, AI_MCP_TRANSPORTS } from '../common';
import { McpGatewayDelegationService } from './mcp-gateway-delegation.service';
import { McpServerLifecycleService } from './mcp-server-lifecycle.service';
import { McpSessionManagerService } from './mcp-session-manager.service';
import { McpSessionRegistryService } from './mcp-session-registry.service';
import { McpToolRegistryService } from './mcp-tool-registry.service';
import { McpTransportRegistryService } from './mcp-transport-registry.service';

describe('MCP foundation', () => {
  const createModule = async () =>
    Test.createTestingModule({
      imports: [AiModule],
    }).compile();

  afterEach(() => {
    delete process.env.AI_MCP_TOOL_METADATA_TOOL_ENABLED;
  });

  it('tracks session metadata and publishes session lifecycle events', async () => {
    const moduleRef = await createModule();
    const manager = moduleRef.get(McpSessionManagerService);
    const registry = moduleRef.get(McpSessionRegistryService);
    const eventBus = moduleRef.get(AIEventBusService);

    const session = await manager.openSession({
      capabilities: ['tools', 'resources'],
      clientId: 'client-1',
      clientType: 'codex',
      connectionId: 'connection-1',
      protocolVersion: 'metadata-only',
      sessionId: 'session-1',
    });

    expect(session).toMatchObject({
      clientId: 'client-1',
      connectionId: 'connection-1',
      sessionId: 'session-1',
      state: 'active',
    });
    expect(registry.getDiagnostics()).toMatchObject({
      activeSessionIds: ['session-1'],
      sessionCount: 1,
    });

    await manager.closeSession('session-1');

    expect(registry.findSessionById('session-1')).toMatchObject({
      state: 'closed',
    });
    expect(eventBus.getDiagnostics()).toMatchObject({
      eventCount: 2,
      lastPublishedEventName: 'McpSessionClosed',
    });

    await moduleRef.close();
  });

  it('tracks MCP server lifecycle metadata through events', async () => {
    const moduleRef = await createModule();
    const lifecycle = moduleRef.get(McpServerLifecycleService);
    const eventBus = moduleRef.get(AIEventBusService);

    expect(lifecycle.getMetadata().state).toBe('created');
    await lifecycle.initialize();
    expect(lifecycle.getMetadata().state).toBe('ready');
    await lifecycle.stop();

    expect(lifecycle.getMetadata().state).toBe('stopped');
    expect(eventBus.getDiagnostics()).toMatchObject({
      eventCount: 2,
      lastPublishedEventName: 'McpServerStopped',
    });

    await moduleRef.close();
  });

  it('discovers MCP tool and transport metadata through registries', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    })
      .overrideProvider(AI_MCP_TOOLS)
      .useValue([
        {
          capabilityId: 'chat',
          id: 'metadata-tool',
          lifecycleStatus: 'enabled',
          name: 'Metadata Tool',
          priority: 10,
          requiredPermissions: [],
          title: 'Metadata Tool',
          version: '1.0.0',
        },
      ])
      .overrideProvider(AI_MCP_TRANSPORTS)
      .useValue([
        {
          id: 'metadata-transport',
          lifecycleStatus: 'enabled',
          name: 'Metadata Transport',
          priority: 10,
          protocolVersions: ['metadata-only'],
          transportType: 'in-process',
          version: '1.0.0',
        },
      ])
      .compile();
    const toolRegistry = moduleRef.get(McpToolRegistryService);
    const transportRegistry = moduleRef.get(McpTransportRegistryService);

    expect(toolRegistry.getTools().map((tool) => tool.id)).toEqual([
      'metadata-tool',
    ]);
    expect(
      transportRegistry.getTransports().map((transport) => transport.id),
    ).toEqual(['metadata-transport']);
    expect(toolRegistry.getDiagnostics()).toMatchObject({
      enabledEntryIds: ['metadata-tool'],
      entryCount: 1,
      registryName: 'mcp-tool-registry',
    });

    await moduleRef.close();
  });

  it('preserves gateway delegation as a metadata boundary', async () => {
    const moduleRef = await createModule();
    const delegation = moduleRef.get(McpGatewayDelegationService);

    await expect(
      delegation.delegateToGateway({
        correlationId: 'corr-1',
        metadata: {
          reason: 'test',
        },
        sessionId: 'session-1',
        target: 'gateway',
      }),
    ).resolves.toEqual({
      delegated: true,
      target: 'gateway',
    });

    await moduleRef.close();
  });
});
