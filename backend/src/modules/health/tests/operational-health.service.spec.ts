import { ServiceUnavailableException } from '@nestjs/common';
import { OperationalHealthService } from '../operational-health.service';

describe('OperationalHealthService', () => {
  let service: OperationalHealthService;
  let dataSource: { query: jest.Mock };

  beforeEach(() => {
    dataSource = {
      query: jest.fn(),
    };
    service = new OperationalHealthService(dataSource as never);
  });

  it('reports postgres and redis as healthy when checks pass', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    jest
      .spyOn(service as never, 'openTcpConnection')
      .mockResolvedValue(undefined);

    await expect(service.getReport()).resolves.toEqual(
      expect.objectContaining({
        services: [
          { name: 'postgres', status: 'up' },
          { name: 'redis', status: 'up' },
        ],
        status: 'ok',
      }),
    );
  });

  it('fails readiness validation when a dependency is unavailable', async () => {
    dataSource.query.mockRejectedValue(new Error('database unavailable'));
    jest
      .spyOn(service as never, 'openTcpConnection')
      .mockRejectedValue(new Error('redis unavailable'));

    await expect(service.ensureReady()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
