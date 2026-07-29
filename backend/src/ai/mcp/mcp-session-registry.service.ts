import { Injectable } from '@nestjs/common';
import {
  McpSessionMetadata,
  McpSessionRegistryDiagnostics,
} from './mcp-platform.types';

@Injectable()
export class McpSessionRegistryService {
  private readonly sessions = new Map<string, McpSessionMetadata>();

  closeSession(sessionId: string, closedAt: string): McpSessionMetadata | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    const closedSession: McpSessionMetadata = {
      ...session,
      lastActivityAt: closedAt,
      state: 'closed',
    };
    this.sessions.set(sessionId, closedSession);

    return closedSession;
  }

  findSessionById(sessionId: string): McpSessionMetadata | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getDiagnostics(): McpSessionRegistryDiagnostics {
    const sessions = this.getSessions();

    return {
      activeSessionIds: sessions
        .filter((session) => session.state !== 'closed')
        .map((session) => session.sessionId),
      closedSessionIds: sessions
        .filter((session) => session.state === 'closed')
        .map((session) => session.sessionId),
      sessionCount: sessions.length,
    };
  }

  getSessions(): McpSessionMetadata[] {
    return [...this.sessions.values()].sort((left, right) =>
      left.sessionId.localeCompare(right.sessionId),
    );
  }

  registerSession(session: McpSessionMetadata): void {
    this.sessions.set(session.sessionId, session);
  }
}
