import { Module } from '@nestjs/common';
import { AiModule } from '../../ai';
import { AiPlaygroundController } from './ai-playground.controller';

@Module({
  imports: [AiModule],
  controllers: [AiPlaygroundController],
})
export class AiPlaygroundModule {}
