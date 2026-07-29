import { Injectable } from '@nestjs/common';
import { ConversationSessionMetadata } from './conversation-platform.types';

@Injectable()
export class ConversationSessionRegistryService {
  private readonly sessions = new Map<string, ConversationSessionMetadata>();

  findSessionById(sessionId: string): ConversationSessionMetadata | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getSessions(): ConversationSessionMetadata[] {
    return [...this.sessions.values()].sort((left, right) =>
      left.sessionId.localeCompare(right.sessionId),
    );
  }

  registerSession(session: ConversationSessionMetadata): void {
    this.sessions.set(session.sessionId, Object.freeze({ ...session }));
  }
}
