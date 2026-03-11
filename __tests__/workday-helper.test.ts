import { describe, it, expect } from 'vitest';
import { addWorkdays, countWorkdays, isWorkday } from '@/lib/workday-helper';

describe('WorkdayHelper', () => {
  describe('isWorkday', () => {
    it('returns true for a normal weekday (Wednesday, Nov 1, 2023)', () => {
      // 2023-11-01 is a Wednesday
      expect(isWorkday(new Date('2023-11-01T12:00:00Z'), 'CO')).toBe(true);
    });

    it('returns false for Saturday', () => {
      // 2023-11-04 is a Saturday
      expect(isWorkday(new Date('2023-11-04T12:00:00Z'), 'CO')).toBe(false);
    });

    it('returns false for Sunday', () => {
      // 2023-11-05 is a Sunday
      expect(isWorkday(new Date('2023-11-05T12:00:00Z'), 'CO')).toBe(false);
    });

    it('returns false for a Colombian Festivo (e.g. 2024-01-01)', () => {
      // Año Nuevo 2024
      expect(isWorkday(new Date('2024-01-01T12:00:00Z'), 'CO')).toBe(false);
    });
  });

  describe('addWorkdays (Viernes + 8 días)', () => {
    it('adds workdays correctly skipping weekends', () => {
      // Friday, Nov 3, 2023
      const startDate = new Date('2023-11-03T12:00:00Z');
      
      // + 8 days 
      // Nov 3 (Fri)
      // Nov 4-5 (Weekend)
      // Nov 6 (Festivo - Todos los santos) -> skipped
      // Nov 7 (Tue) - Day 1
      // Nov 8 (Wed) - Day 2
      // Nov 9 (Thu) - Day 3
      // Nov 10 (Fri) - Day 4
      // Nov 11-12 (Weekend)
      // Nov 13 (Festivo - Indep. Cartagena) -> skipped
      // Nov 14 (Tue) - Day 5
      // Nov 15 (Wed) - Day 6
      // Nov 16 (Thu) - Day 7
      // Nov 17 (Fri) - Day 8
      
      // We know Nov 6 and Nov 13 are holidays in 2023 Colombia.
      const resultDate = addWorkdays(startDate, 8, 'CO');
      
      expect(resultDate.toISOString().split('T')[0]).toBe('2023-11-17');
    });

    it('Friday + 1 workday is Monday (assuming no holiday)', () => {
      // Nov 10, 2023 (Fri)
      const startDate = new Date('2023-11-10T12:00:00Z');
      // + 1 Workday = Nov 14 (Because Nov 13 is holiday in 2023)
      const resultDate = addWorkdays(startDate, 1, 'CO');
      expect(resultDate.toISOString().split('T')[0]).toBe('2023-11-14');
    });
  });

  describe('countWorkdays', () => {
    it('counts workdays between two dates accurately', () => {
      const start = new Date('2023-11-01T12:00:00Z'); // Wed
      const end = new Date('2023-11-10T12:00:00Z');   // Fri (Next week)
      
      // Wed, Thu, Fri (3) + Mon(Holiday Nov 6 so 0), Tue, Wed, Thu, Fri (4) = 7
      expect(countWorkdays(start, end, 'CO')).toBe(7);
    });
  });
});
