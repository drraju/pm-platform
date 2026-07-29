import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiLoggerService {
  private readonly logger = new Logger('AiPlatform');

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.logger.debug(this.format(message, metadata));
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.logger.error(this.format(message, metadata));
  }

  log(message: string, metadata?: Record<string, unknown>): void {
    this.logger.log(this.format(message, metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.logger.warn(this.format(message, metadata));
  }

  private format(message: string, metadata?: Record<string, unknown>): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return message;
    }

    return `${message} ${JSON.stringify(metadata)}`;
  }
}
