import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient } from 'redis';
import { GOOGLE_OIDC_CONFIGURATION } from './google-oidc.configuration';
import type { GoogleOidcConfiguration } from './google-oidc.types';

export const OIDC_REDIS_COMMANDS = Symbol('OIDC_REDIS_COMMANDS');

export interface OidcRedisCommands {
  get(key: string): Promise<string | null>;
  setOneUse(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  take(key: string): Promise<string | null>;
}

@Injectable()
export class OidcRedisClient implements OidcRedisCommands, OnModuleDestroy {
  private client: ReturnType<typeof createClient> | undefined;
  private connection: Promise<void> | undefined;

  constructor(
    @Inject(GOOGLE_OIDC_CONFIGURATION)
    private readonly configuration: GoogleOidcConfiguration,
  ) {}

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    return client.get(key);
  }

  async setOneUse(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const client = await this.getClient();
    return (
      (await client.set(key, value, { EX: ttlSeconds, NX: true })) === 'OK'
    );
  }

  async take(key: string): Promise<string | null> {
    const client = await this.getClient();
    const result: unknown = await client.sendCommand(['GETDEL', key]);
    return typeof result === 'string' ? result : null;
  }

  onModuleDestroy(): void {
    this.client?.destroy();
  }

  private async getClient(): Promise<ReturnType<typeof createClient>> {
    if (!this.configuration.enabled) {
      throw new Error('Google OIDC Redis access is disabled');
    }
    if (!this.client) {
      this.client = createClient({
        socket: {
          host: this.configuration.redisHost,
          port: this.configuration.redisPort,
        },
      });
      this.client.on('error', () => undefined);
    }
    if (!this.client.isOpen) {
      this.connection ??= this.client.connect().then(() => undefined);
      try {
        await this.connection;
      } finally {
        this.connection = undefined;
      }
    }
    return this.client;
  }
}
