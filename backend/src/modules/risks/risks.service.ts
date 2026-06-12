import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk } from '../raid/entities/risk.entity';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';

@Injectable()
export class RisksService {
  constructor(
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
  ) {}

  create(createRiskDto: CreateRiskDto): Promise<Risk> {
    return this.risksRepository.save(
      this.risksRepository.create(createRiskDto),
    );
  }

  findAll(): Promise<Risk[]> {
    return this.risksRepository.find({
      relations: { project: true, owner: true },
    });
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

  async update(id: string, updateRiskDto: UpdateRiskDto): Promise<Risk> {
    const risk = await this.findOne(id);
    Object.assign(risk, updateRiskDto);
    return this.risksRepository.save(risk);
  }

  async remove(id: string): Promise<void> {
    const risk = await this.findOne(id);
    await this.risksRepository.remove(risk);
  }
}
