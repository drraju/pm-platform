import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import type { Response } from 'express';
import { ProjectExportService } from './project-export.service';

type AuthenticatedRequest = Request & { user: { userId: string; roleId: string } };
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectExportController {
  constructor(private readonly exports: ProjectExportService) {}

  @Get(':projectId/export/excel')
  @RequirePermissions(PermissionKey.ProjectRead)
  async excel(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest, @Res() response: Response) {
    const workbook = await this.exports.exportProject(projectId, request.user);
    response.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="project-${projectId}.xlsx"` });
    response.send(workbook);
  }
}
