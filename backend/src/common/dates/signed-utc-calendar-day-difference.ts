const millisecondsPerDay = 86_400_000;

export function signedUtcCalendarDayDifference(
  comparisonDate?: string | null,
  referenceDate?: string | null,
): number | null {
  if (!comparisonDate || !referenceDate) {
    return null;
  }

  const comparisonTime = Date.parse(`${comparisonDate}T00:00:00Z`);
  const referenceTime = Date.parse(`${referenceDate}T00:00:00Z`);
  if (!Number.isFinite(comparisonTime) || !Number.isFinite(referenceTime)) {
    return null;
  }

  return Math.round((comparisonTime - referenceTime) / millisecondsPerDay);
}
