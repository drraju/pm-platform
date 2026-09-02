import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isISO8601, isUUID } from 'class-validator';

const EXTERNAL_CURSOR_VERSION = 1;
const INVALID_CURSOR_MESSAGE = 'Invalid external cursor';

export type ExternalCursor = Readonly<{
  id: string;
  updatedAt: string;
}>;

type ExternalCursorPayload = ExternalCursor & {
  version: typeof EXTERNAL_CURSOR_VERSION;
};

export class ExternalCursorCodec {
  constructor(private readonly signingSecret: string) {
    if (!signingSecret) {
      throw new Error('External cursor signing secret is required');
    }
  }

  encode(cursor: ExternalCursor): string {
    this.assertCursor(cursor);
    const payload = Buffer.from(
      JSON.stringify({
        id: cursor.id,
        updatedAt: cursor.updatedAt,
        version: EXTERNAL_CURSOR_VERSION,
      } satisfies ExternalCursorPayload),
    ).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }

  decode(cursor: string): ExternalCursor {
    try {
      const [payload, signature, extra] = cursor.split('.');
      if (!payload || !signature || extra) {
        throw new Error('Malformed cursor');
      }

      const expectedSignature = Buffer.from(this.sign(payload), 'base64url');
      const suppliedSignature = Buffer.from(signature, 'base64url');
      if (
        expectedSignature.length !== suppliedSignature.length ||
        !timingSafeEqual(expectedSignature, suppliedSignature)
      ) {
        throw new Error('Invalid cursor signature');
      }

      const parsed = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Partial<ExternalCursorPayload>;
      if (
        parsed.version !== EXTERNAL_CURSOR_VERSION ||
        Object.keys(parsed).sort().join(',') !== 'id,updatedAt,version'
      ) {
        throw new Error('Unsupported cursor payload');
      }

      const decoded = {
        id: parsed.id,
        updatedAt: parsed.updatedAt,
      } as ExternalCursor;
      this.assertCursor(decoded);
      return Object.freeze(decoded);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(INVALID_CURSOR_MESSAGE);
    }
  }

  private assertCursor(cursor: Partial<ExternalCursor>): void {
    if (
      typeof cursor.id !== 'string' ||
      !isUUID(cursor.id) ||
      typeof cursor.updatedAt !== 'string' ||
      !isISO8601(cursor.updatedAt, { strict: true, strictSeparator: true })
    ) {
      throw new BadRequestException(INVALID_CURSOR_MESSAGE);
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.signingSecret)
      .update(`pm-platform:external:v1:cursor:${payload}`)
      .digest('base64url');
  }
}
