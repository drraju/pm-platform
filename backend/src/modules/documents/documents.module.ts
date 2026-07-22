import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentCategory, DocumentType, ProjectDocument } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentCategory,
      DocumentType,
      ProjectDocument,
      Project,
      User,
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
