import { Repository } from 'typeorm';
import { EnterpriseCalendar } from '../entities/enterprise-calendar.entity';
import { EnterpriseCalendarLookupService } from '../enterprise-calendar-lookup.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('EnterpriseCalendarLookupService', () => {
  let service: EnterpriseCalendarLookupService;
  let calendarsRepository: MockRepository<EnterpriseCalendar>;

  beforeEach(() => {
    calendarsRepository = {
      findOne: jest.fn(),
    };
    service = new EnterpriseCalendarLookupService(
      calendarsRepository as Repository<EnterpriseCalendar>,
    );
  });

  it('retrieves Calendar reference metadata without loading Calendar relations', async () => {
    const calendar = Object.assign(new EnterpriseCalendar(), {
      id: '22222222-2222-4222-8222-222222222222',
    });
    calendarsRepository.findOne?.mockResolvedValue(calendar);

    await expect(service.findCalendarReference(calendar.id)).resolves.toBe(
      calendar,
    );

    expect(calendarsRepository.findOne).toHaveBeenCalledWith({
      where: { id: calendar.id },
      withDeleted: true,
    });
  });

  it('returns null when the Calendar does not exist', async () => {
    calendarsRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.findCalendarReference('22222222-2222-4222-8222-222222222222'),
    ).resolves.toBeNull();
  });
});
