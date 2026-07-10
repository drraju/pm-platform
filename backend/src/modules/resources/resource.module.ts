import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceController } from './resource.controller';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceApiService } from './resource-api.service';
import { Resource } from './entities/resource.entity';
import { ResourceValidationService } from './resource-validation.service';
import { ResourceService } from './resource.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resource, ResourceAssignment])],
  controllers: [ResourceController],
  providers: [ResourceService, ResourceValidationService, ResourceApiService],
  exports: [ResourceService, ResourceValidationService],
})
export class ResourceModule {}
