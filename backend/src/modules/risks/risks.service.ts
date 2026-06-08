import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AuthenticatedPrincipal,
  AuthorizationService,
} from '../authorization/authorization.service';
import { PermissionKey } from '../authorization/permissions';
import { Risk } from '../raid/entities/risk.entity';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';

@Injectable()
export class RisksService {
  constructor(
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  create(createRiskDto: CreateRiskDto): Promise<Risk> {
    return this.risksRepository.save(this.risksRepository.create(createRiskDto));
  }

  findAll(): Promise<Risk[]> {
    return this.risksRepository.find({
      relations: { project: true, owner: true },
    });
  }

  async findAllForUser(principal: AuthenticatedPrincipal): Promise<Risk[]> {
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    const accessibleProjectIds =
      await this.authorizationService.getAccessibleProjectIds(user);
    if (accessibleProjectIds?.length === 0) {
      return [];
    }

    return this.risksRepository.find({
      relations: { project: true, owner: true },
      where:
        accessibleProjectIds === null ||
        this.authorizationService.hasPermission(user, PermissionKey.RaidReadAll)
          ? {}
          : { projectId: In(accessibleProjectIds) },
    });
  }

  async createForUser(
    principal: AuthenticatedPrincipal,
    createRiskDto: CreateRiskDto,
  ): Promise<Risk> {
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    this.authorizationService.assertHasAnyPermission(user, [
      PermissionKey.RaidCreate,
    ]);
    await this.authorizationService.assertCanReadProject(
      user,
      createRiskDto.projectId,
    );
    return this.create(createRiskDto);
  }

  async findOne(id: string): Promise<Risk> {
    const risk = await this.risksRepository.findOne({
      where: { id },
      relations: { project: true, owner: true },
    });
    if (!risk) {
      throw new NotFoundException(`Risk ${id} not found`);
    }

    return risk;
  }

  async findOneForUser(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<Risk> {
    const risk = await this.findOne(id);
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    await this.authorizationService.assertCanReadProject(user, risk.projectId);
    return risk;
  }

  async update(id: string, updateRiskDto: UpdateRiskDto): Promise<Risk> {
    const risk = await this.findOne(id);
    Object.assign(risk, updateRiskDto);
    return this.risksRepository.save(risk);
  }

  async updateForUser(
    principal: AuthenticatedPrincipal,
    id: string,
    updateRiskDto: UpdateRiskDto,
  ): Promise<Risk> {
    const risk = await this.findOne(id);
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );

    if (this.authorizationService.hasPermission(user, PermissionKey.RaidUpdateAny)) {
      await this.authorizationService.assertCanManageProjectTasks(
        user,
        risk.projectId,
      );
    } else if (
      !this.authorizationService.hasPermission(user, PermissionKey.RaidUpdateOwn) ||
      risk.ownerId !== user.userId
    ) {
      throw new ForbiddenException('Risk update access denied');
    }

    Object.assign(risk, updateRiskDto);
    return this.risksRepository.save(risk);
  }

  async remove(id: string): Promise<void> {
    const risk = await this.findOne(id);
    await this.risksRepository.remove(risk);
  }

  async removeForUser(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<void> {
    const risk = await this.findOne(id);
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    this.authorizationService.assertHasAnyPermission(user, [PermissionKey.RaidDelete]);
    await this.authorizationService.assertCanManageProjectTasks(
      user,
      risk.projectId,
    );
    await this.risksRepository.remove(risk);
  }
}
