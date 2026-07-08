import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzModule } from '../../common/authz/authz.module';
import { CalendarModule as EnterpriseCalendarDomainModule } from '../calendars/calendar.module';
import { EnterpriseCalendarException } from '../calendars/entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from '../calendars/entities/enterprise-calendar.entity';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [
    AuthzModule,
    EnterpriseCalendarDomainModule,
    TypeOrmModule.forFeature([EnterpriseCalendar, EnterpriseCalendarException]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
