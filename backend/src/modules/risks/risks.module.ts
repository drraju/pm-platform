import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Risk } from '../raid/entities/risk.entity';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Risk])],
  controllers: [RisksController],
  providers: [RisksService],
  exports: [RisksService],
})
export class RisksModule {}
