import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AssignResourceCalendarDto,
  ClearResourceCalendarAssignmentDto,
  ReplaceResourceCalendarDto,
} from '../dto/resource-calendar-assignment.dto';

const calendarId = '22222222-2222-4222-8222-222222222222';

describe('Resource Calendar Assignment DTO validation', () => {
  it.each([AssignResourceCalendarDto, ReplaceResourceCalendarDto])(
    'accepts a valid Calendar payload for %p',
    async (DtoType) => {
      const dto = plainToInstance(DtoType, { calendarId });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each([AssignResourceCalendarDto, ReplaceResourceCalendarDto])(
    'rejects an invalid Calendar UUID for %p',
    async (DtoType) => {
      const dto = plainToInstance(DtoType, { calendarId: 'not-a-uuid' });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it.each([AssignResourceCalendarDto, ReplaceResourceCalendarDto])(
    'rejects a missing Calendar id for %p',
    async (DtoType) => {
      const dto = plainToInstance(DtoType, {});

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it('accepts an empty clear-assignment payload', async () => {
    const dto = plainToInstance(ClearResourceCalendarAssignmentDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a non-empty clear-assignment payload', async () => {
    const dto = plainToInstance(ClearResourceCalendarAssignmentDto, {
      payload: 'unexpected',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
