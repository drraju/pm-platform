import { MODULE_METADATA } from '@nestjs/common/constants';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Assumption } from '../entities/assumption.entity';
import { Dependency } from '../entities/dependency.entity';
import { Issue } from '../entities/issue.entity';
import { Risk } from '../entities/risk.entity';
import { RaidModule } from '../raid.module';

describe('RaidService', () => {
  it.todo('defines RAID register behavior');

  it('registers all RAID entities with TypeORM', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, RaidModule) as
      | Array<{ providers?: Array<{ provide?: unknown }> }>
      | undefined;
    const providers = imports?.flatMap(
      (moduleImport) => moduleImport.providers ?? [],
    );

    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: getRepositoryToken(Assumption) }),
        expect.objectContaining({ provide: getRepositoryToken(Dependency) }),
        expect.objectContaining({ provide: getRepositoryToken(Issue) }),
        expect.objectContaining({ provide: getRepositoryToken(Risk) }),
      ]),
    );
  });
});
