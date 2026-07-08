import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceValidationService } from './resource-validation.service';
import { ResourceService } from './resource.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resource])],
  providers: [ResourceService, ResourceValidationService],
  exports: [ResourceService, ResourceValidationService],
})
export class ResourceModule {}
