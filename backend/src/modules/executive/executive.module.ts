import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ExecutiveController } from './executive.controller';
import { ExecutiveService } from './executive.service';

@Module({
  imports: [AuthorizationModule, PortfolioModule],
  controllers: [ExecutiveController],
  providers: [ExecutiveService],
})
export class ExecutiveModule {}
