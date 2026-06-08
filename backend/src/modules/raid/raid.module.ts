import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Assumption } from './entities/assumption.entity';
import { Dependency } from './entities/dependency.entity';
import { Issue } from './entities/issue.entity';
import { Risk } from './entities/risk.entity';
import { RaidController } from './raid.controller';
import { RaidService } from './raid.service';

@Module({
  imports: [
    AuthorizationModule,
    TypeOrmModule.forFeature([Assumption, Dependency, Issue, Risk]),
  ],
  controllers: [RaidController],
  providers: [RaidService],
  exports: [RaidService],
})
export class RaidModule {}
