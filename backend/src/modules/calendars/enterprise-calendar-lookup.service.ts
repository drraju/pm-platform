import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnterpriseCalendar } from './entities/enterprise-calendar.entity';

@Injectable()
export class EnterpriseCalendarLookupService {
  constructor(
    @InjectRepository(EnterpriseCalendar)
    private readonly enterpriseCalendarsRepository: Repository<EnterpriseCalendar>,
  ) {}

  findCalendarReference(
    calendarId: string,
  ): Promise<EnterpriseCalendar | null> {
    return this.enterpriseCalendarsRepository.findOne({
      where: { id: calendarId },
      withDeleted: true,
    });
  }
}
