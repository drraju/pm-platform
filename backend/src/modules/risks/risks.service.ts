import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { Risk } from '../raid/entities/risk.entity';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';

@Injectable()
export class RisksService {
  constructor(
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    private readonly projectVisibilityService: ProjectVisibilityService,
  ) {}

  create(createRiskDto: CreateRiskDto): Promise<Risk> {
    return this.risksRepository.save(
      this.risksRepository.create(createRiskDto),
    );
  }

  async findAll(actor?: ProjectVisibilityActor): Promise<Risk[]> {
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    if (visibleProjectIds !== 'all' && visibleProjectIds.length === 0) {
      return [];
    }

    return this.risksRepository.find({
      relations: { project: true, owner: true },
      ...(visibleProjectIds === 'all'
        ? {}
        : { where: { projectId: In(visibleProjectIds) } }),
    });
  }

  async findOne(id: string, actor?: ProjectVisibilityActor): Promise<Risk> {
    const risk = await this.risksRepository.findOne({
      where: { id },
      relations: { project: true, owner: true },
    });
    if (
      !risk ||
      !(await this.projectVisibilityService.canViewProject(risk.projectId, actor))
    ) {
      throw new NotFoundException(`Risk ${id} not found`);
    }

    return risk;
  }

  async update(
    id: string,
    updateRiskDto: UpdateRiskDto,
    actor?: ProjectVisibilityActor,
  ): Promise<Risk> {
    const risk = await this.findOne(id, actor);
    Object.assign(risk, updateRiskDto);
    return this.risksRepository.save(risk);
  }

  async remove(id: string, actor?: ProjectVisibilityActor): Promise<void> {
    const risk = await this.findOne(id, actor);
    await this.risksRepository.remove(risk);
  }
}
