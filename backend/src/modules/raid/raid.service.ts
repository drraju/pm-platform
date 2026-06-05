import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaidType } from '../../common/enums/raid-type.enum';
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { Assumption } from './entities/assumption.entity';
import { Dependency } from './entities/dependency.entity';
import { Issue } from './entities/issue.entity';
import { Risk } from './entities/risk.entity';

@Injectable()
export class RaidService {
  constructor(
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    @InjectRepository(Issue)
    private readonly issuesRepository: Repository<Issue>,
    @InjectRepository(Assumption)
    private readonly assumptionsRepository: Repository<Assumption>,
    @InjectRepository(Dependency)
    private readonly dependenciesRepository: Repository<Dependency>,
  ) {}

  async findAll() {
    const relations = { project: true, owner: true };
    const [risks, issues, assumptions, dependencies] = await Promise.all([
      this.risksRepository.find({ relations }),
      this.issuesRepository.find({ relations }),
      this.assumptionsRepository.find({ relations }),
      this.dependenciesRepository.find({ relations }),
    ]);

    return [...risks, ...issues, ...assumptions, ...dependencies].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  create(createRaidItemDto: CreateRaidItemDto) {
    switch (createRaidItemDto.type) {
      case RaidType.Risk:
        return this.risksRepository.save(
          this.risksRepository.create(createRaidItemDto),
        );
      case RaidType.Issue:
        return this.issuesRepository.save(
          this.issuesRepository.create(createRaidItemDto),
        );
      case RaidType.Assumption:
        return this.assumptionsRepository.save(
          this.assumptionsRepository.create(createRaidItemDto),
        );
      case RaidType.Dependency:
        return this.dependenciesRepository.save(
          this.dependenciesRepository.create(createRaidItemDto),
        );
    }
  }
}
