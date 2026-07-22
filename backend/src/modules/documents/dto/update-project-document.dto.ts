import { PartialType } from '@nestjs/swagger';
import { CreateProjectDocumentDto } from './create-project-document.dto';

export class UpdateProjectDocumentDto extends PartialType(
  CreateProjectDocumentDto,
) {}
