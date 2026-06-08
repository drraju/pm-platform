import { MODULE_METADATA } from '@nestjs/common/constants';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationsModule } from '../notifications.module';

describe('NotificationsService', () => {
  it.todo('defines notification delivery behavior');

  it('registers the notification entity with TypeORM', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      NotificationsModule,
    ) as Array<{ providers?: Array<{ provide?: unknown }> }> | undefined;
    const providers = imports?.flatMap(
      (moduleImport) => moduleImport.providers ?? [],
    );

    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: getRepositoryToken(Notification) }),
      ]),
    );
  });
});
