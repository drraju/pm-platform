import { PartialType } from '@nestjs/swagger';
import { CreatePortfolioDependencyDto } from './create-portfolio-dependency.dto';

export class UpdatePortfolioDependencyDto extends PartialType(
  CreatePortfolioDependencyDto,
) {}
