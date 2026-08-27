import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const timeZone = 'America/Sao_Paulo';
const testDates = (startStr: string, endStr: string) => {
  const customStart = new Date(startStr);
  const customEnd = new Date(endStr);

  const customStartZoned = toZonedTime(customStart, timeZone);
  customStartZoned.setHours(0, 0, 0, 0);
  const startDate = fromZonedTime(customStartZoned, timeZone);

  const customEndZoned = toZonedTime(customEnd, timeZone);
  customEndZoned.setHours(23, 59, 59, 999);
  const endDate = fromZonedTime(customEndZoned, timeZone);

  console.log(`Input: ${startStr} to ${endStr}`);
  console.log(`Parsed Zoned: ${customStartZoned.toISOString()} to ${customEndZoned.toISOString()}`);
  console.log(`Final UTC: ${startDate.toISOString()} to ${endDate.toISOString()}`);
};

testDates("2026-07-24", "2026-08-24");
testDates("2026-08-01", "2026-08-24");
