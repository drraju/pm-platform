import { Injectable } from '@nestjs/common';
import {
  MilestoneListResponseDto,
  MilestoneResponseDto,
} from './dto/milestone-response.dto';
import { MilestoneApiState } from './dto/milestone-query.dto';
import { MilestoneQueryDto } from './dto/milestone-query.dto';
import { MilestoneQuery } from './milestone-query.service';
import {
  MilestoneProjection,
  MilestoneProjectionPage,
} from './milestone-projection';

@Injectable()
export class MilestoneResponseMapper {
  toQuery(query: MilestoneQueryDto): MilestoneQuery {
    return {
      category: query.category,
      critical: query.critical,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      includeCancelled: query.includeCancelled,
      overdue: query.overdue,
      ownerId: query.ownerId,
      page: query.page,
      pageSize: query.pageSize,
      projectIds: query.projectId ? [query.projectId] : undefined,
      search: query.search,
      sortBy: query.sort,
      sortDirection: query.order,
      states: query.state,
    };
  }

  toResponse(projection: MilestoneProjection): MilestoneResponseDto {
    return {
      actualDate: projection.actualDate,
      baselineDate: projection.baselineDate,
      calculatedAt: projection.calculatedAt?.toISOString() ?? null,
      calculationStatus: projection.calculationStatus,
      category: projection.category,
      critical: projection.critical,
      daysRemaining: projection.daysRemaining,
      forecastDate: projection.forecastDate,
      id: projection.id,
      overdue: projection.overdue,
      owner: projection.owner,
      plannedDate: projection.plannedDate,
      projectId: projection.projectId,
      state: projection.state as MilestoneApiState,
      taskId: projection.taskId,
      title: projection.title,
      varianceDays: projection.varianceDays,
    };
  }

  toListResponse(page: MilestoneProjectionPage): MilestoneListResponseDto {
    return {
      items: page.items.map((item) => this.toResponse(item)),
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: Math.ceil(page.total / page.pageSize),
    };
  }
}
