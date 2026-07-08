import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { CalendarExceptionType } from '../enums/calendar-exception-type.enum';
import { EnterpriseCalendar } from './enterprise-calendar.entity';

@Entity({ name: 'enterprise_calendar_exceptions' })
export class EnterpriseCalendarException extends AuditableEntity {
  @Column({ name: 'enterprise_calendar_id', type: 'uuid' })
  enterpriseCalendarId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'exception_type', type: 'varchar' })
  exceptionType: CalendarExceptionType;

  @Column()
  name: string;

  @Column({ name: 'working_day_start', type: 'time', nullable: true })
  workingDayStart?: string | null;

  @Column({ name: 'working_day_end', type: 'time', nullable: true })
  workingDayEnd?: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  hours?: number | null;

  @ManyToOne(
    () => EnterpriseCalendar,
    (enterpriseCalendar) => enterpriseCalendar.exceptions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'enterprise_calendar_id' })
  enterpriseCalendar: EnterpriseCalendar;
}
