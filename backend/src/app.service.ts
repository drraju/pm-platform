import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealthSnapshot() {
    return {
      name: 'pm-platform-backend',
      status: 'up' as const,
      timestamp: new Date().toISOString(),
    };
  }
}
