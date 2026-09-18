export type TimelineZoomMode = "day" | "week" | "month" | "quarter";

export type TimelineDatedItem = {
  readonly finishDate: string | null;
  readonly startDate: string | null;
  readonly taskKind: "standard" | "summary" | "milestone";
};

export type TimelineScale = ReturnType<typeof buildTimeline>;

export function buildTimeline(
  items: readonly TimelineDatedItem[],
  zoom: TimelineZoomMode,
  fitWidth?: number | null,
  currentDate = today(),
) {
  const starts = items
    .map((item) => item.startDate)
    .filter((value): value is string => Boolean(value));
  const finishes = items
    .map((item) => item.finishDate)
    .filter((value): value is string => Boolean(value));
  const sortedStarts = [...starts].sort();
  const sortedFinishes = [...finishes].sort();
  const earliestDate =
    [sortedStarts[0], currentDate]
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? currentDate;
  const latestDate =
    [sortedFinishes[sortedFinishes.length - 1], currentDate]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? currentDate;
  const min = addDays(parseDate(earliestDate), -3);
  const max = addDays(parseDate(latestDate), 21);
  const daysPerUnit =
    zoom === "day" ? 1 : zoom === "week" ? 7 : zoom === "month" ? 30 : 90;
  const baseUnitWidth =
    zoom === "day" ? 34 : zoom === "week" ? 58 : zoom === "month" ? 86 : 120;
  const totalDays = Math.max(1, diffDays(formatDate(min), formatDate(max)));
  const units = Math.ceil(totalDays / daysPerUnit);
  const fittedUnitWidth =
    fitWidth && fitWidth > 0 ? Math.max(8, fitWidth / (units + 1)) : null;
  const unitWidth = fittedUnitWidth
    ? Math.min(baseUnitWidth, fittedUnitWidth)
    : baseUnitWidth;
  const ticks = Array.from({ length: units + 1 }).map((_, index) => {
    const date = addDays(min, index * daysPerUnit);
    return {
      date: formatDate(date),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
      label:
        zoom === "quarter"
          ? `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`
          : zoom === "month"
            ? date.toLocaleDateString("en", { month: "short", timeZone: "UTC" })
            : date.toLocaleDateString("en", {
                day: "2-digit",
                month: "short",
                timeZone: "UTC",
              }),
      x: index * unitWidth,
    };
  });
  const todayOffset = diffDays(formatDate(min), currentDate);
  return {
    daysPerUnit,
    startDate: formatDate(min),
    ticks,
    todayX:
      todayOffset >= 0 && todayOffset <= totalDays
        ? (todayOffset / daysPerUnit) * unitWidth
        : null,
    unitWidth,
    width: Math.max(fitWidth ?? 900, (units + 1) * unitWidth),
  };
}

export function getBarGeometry(
  item: TimelineDatedItem,
  timeline: TimelineScale,
) {
  if (!item.startDate || !item.finishDate) {
    return null;
  }
  const startOffset = diffDays(timeline.startDate, item.startDate);
  const duration = Math.max(0, diffDays(item.startDate, item.finishDate));
  return {
    width: Math.max(
      item.taskKind === "milestone" ? 16 : 20,
      ((duration || 1) / timeline.daysPerUnit) * timeline.unitWidth,
    ),
    x: (startOffset / timeline.daysPerUnit) * timeline.unitWidth,
  };
}

export function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

export function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function today() {
  return formatDate(new Date());
}

export function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function shiftDate(value: string, days: number) {
  return formatDate(addDays(parseDate(value), days));
}

export function diffDays(start: string, finish: string) {
  return Math.round(
    (parseDate(finish).getTime() - parseDate(start).getTime()) / 86_400_000,
  );
}
