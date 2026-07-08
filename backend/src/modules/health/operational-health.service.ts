import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import net from 'node:net';

export type DependencyHealth = {
  details?: string;
  name: string;
  status: 'up' | 'down';
};

export type OperationalHealthReport = {
  checkedAt: string;
  services: DependencyHealth[];
  status: 'ok' | 'error';
};

@Injectable()
export class OperationalHealthService {
  private readonly logger = new Logger(OperationalHealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getReport(): Promise<OperationalHealthReport> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);
    const services = [postgres, redis];

    return {
      checkedAt: new Date().toISOString(),
      services,
      status: services.every((service) => service.status === 'up')
        ? 'ok'
        : 'error',
    };
  }

  async ensureReady(): Promise<void> {
    const report = await this.getReport();

    if (report.status === 'ok') {
      return;
    }

    const failedDependencies = report.services
      .filter((service) => service.status === 'down')
      .map(
        (service) =>
          `${service.name}${service.details ? ` (${service.details})` : ''}`,
      )
      .join(', ');

    this.logger.error(`Startup validation failed: ${failedDependencies}`);
    throw new ServiceUnavailableException(
      `Startup validation failed: ${failedDependencies}`,
    );
  }

  private async checkPostgres(): Promise<DependencyHealth> {
    try {
      await this.dataSource.query('SELECT 1');
      return { name: 'postgres', status: 'up' };
    } catch (error) {
      return {
        name: 'postgres',
        status: 'down',
        details: this.toErrorMessage(error),
      };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);

    try {
      await this.openTcpConnection(host, port);
      return { name: 'redis', status: 'up' };
    } catch (error) {
      return {
        name: 'redis',
        status: 'down',
        details: this.toErrorMessage(error),
      };
    }
  }

  private openTcpConnection(host: string, port: number) {
    return new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port });

      socket.setTimeout(2000);
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error(`timeout connecting to ${host}:${port}`));
      });
      socket.once('error', (error) => {
        socket.destroy();
        reject(error);
      });
    });
  }

  private toErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown dependency error';
  }
}
