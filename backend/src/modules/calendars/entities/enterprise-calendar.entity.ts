import { Column, Entity, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { CalendarStatus } from '../enums/calendar-status.enum';
import { EnterpriseCalendarException } from './enterprise-calendar-exception.entity';

@Entity({ name: 'enterprise_calendars' })
export class EnterpriseCalendar extends AuditableEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', default: 'UTC' })
  timezone: string;

  @Column({
    name: 'default_working_days',
    type: 'jsonb',
    default: () => "'[1,2,3,4,5]'::jsonb",
  })
  defaultWorkingDays: number[];

  @Column({ name: 'working_day_start', type: 'time', nullable: true })
  workingDayStart?: string | null;

  @Column({ name: 'working_day_end', type: 'time', nullable: true })
  workingDayEnd?: string | null;

  @Column({
    name: 'hours_per_day',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 8,
  })
  hoursPerDay: number;

  @Column({ type: 'varchar', default: CalendarStatus.Active })
  status: CalendarStatus;

  @OneToMany(
    () => EnterpriseCalendarException,
    (exception) => exception.enterpriseCalendar,
  )
  exceptions?: EnterpriseCalendarException[];
}
