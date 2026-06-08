import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Risk } from '../raid/entities/risk.entity';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Risk])],
  controllers: [RisksController],
  providers: [RisksService],
  exports: [RisksService],
})
export class RisksModule {}
