import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import {
  CreateProjectDocumentDto,
  ProjectDocumentQueryDto,
  UpdateProjectDocumentDto,
} from './dto';
import {
  DocumentReferenceValue,
  DocumentsService,
  ProjectDocumentResponse,
  ProjectDocumentSummary,
  StorageProviderReference,
} from './documents.service';

type AuthenticatedRequest = Request & {
  user: {
    email?: string;
    roleId: string;
    userId: string;
  };
};

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents/storage-providers')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse({ isArray: true })
  storageProviders(): StorageProviderReference[] {
    return this.documentsService.storageProviders();
  }

  @Get('documents/document-types')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse({ isArray: true })
  documentTypes(): Promise<DocumentReferenceValue[]> {
    return this.documentsService.documentTypes();
  }

  @Get('documents/categories')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse({ isArray: true })
  categories(): Promise<DocumentReferenceValue[]> {
    return this.documentsService.categories();
  }

  @Post('documents')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse()
  create(
    @Body() input: CreateProjectDocumentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectDocumentResponse> {
    return this.documentsService.create(input, request.user);
  }

  @Get('projects/:projectId/documents/summary')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse()
  summary(
    @Param('projectId') projectId: string,
  ): Promise<ProjectDocumentSummary> {
    return this.documentsService.summary(projectId);
  }

  @Get('projects/:projectId/documents')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse({ isArray: true })
  findProjectDocuments(
    @Param('projectId') projectId: string,
    @Query() query: ProjectDocumentQueryDto,
  ): Promise<ProjectDocumentResponse[]> {
    return this.documentsService.findProjectDocuments(projectId, query);
  }

  @Patch('documents/:documentId')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse()
  update(
    @Param('documentId') documentId: string,
    @Body() input: UpdateProjectDocumentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectDocumentResponse> {
    return this.documentsService.update(documentId, input, request.user);
  }

  @Delete('documents/:documentId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('documentId') documentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.documentsService.remove(documentId, request.user);
  }
}
