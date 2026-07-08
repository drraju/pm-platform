import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarValidationService } from './calendar-validation.service';
import { EnterpriseCalendarException } from './entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from './entities/enterprise-calendar.entity';
import { EnterpriseCalendarService } from './enterprise-calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EnterpriseCalendar,
      EnterpriseCalendarException,
    ]),
  ],
  providers: [CalendarValidationService, EnterpriseCalendarService],
  exports: [CalendarValidationService, EnterpriseCalendarService],
})
export class CalendarModule {}
