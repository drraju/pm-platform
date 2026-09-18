import { getDisplayedPercentComplete } from "@/components/projects/execution-update-payload";
import { diffDays, today } from "@/components/planning/timeline-geometry";
import type {
  ApiForecastSnapshotDetail,
  ApiProjectBaseline,
  ApiTask,
} from "@/lib/api/client";

export type DeliveryPresentationStatus =
  | "At risk"
  | "Complete"
  | "In progress"
  | "Late"
  | "Not started";

export type DeliveryTimelineRow = {
  actualFinish: string | null;
  actualStart: string | null;
  baselineFinish: string | null;
  baselineStart: string | null;
  forecastFinish: string | null;
  forecastStart: string | null;
  presentationStatus: DeliveryPresentationStatus;
  progress: number;
  targetFinish: string | null;
  targetStart: string | null;
  task: ApiTask;
  varianceDays: number | null;
  varianceSource: "Actual" | "Forecast" | null;
};

export type DeliveryTimelineSummary = {
  completionPercent: number;
  currentForecastFinish: string | null;
  targetFinish: string | null;
  varianceDays: number | null;
};

export function buildDeliveryTimelineRows({
  activeBaseline,
  currentForecast,
  tasks,
  todayDate = today(),
}: {
  activeBaseline?: ApiProjectBaseline | null;
  currentForecast?: ApiForecastSnapshotDetail | null;
  tasks: readonly ApiTask[];
  todayDate?: string;
}): DeliveryTimelineRow[] {
  const forecastByTaskId = new Map(
    currentForecast?.snapshot.calculationStatus === "calculated"
      ? currentForecast.taskSchedules
          .filter(
            (schedule): schedule is typeof schedule & { taskId: string } =>
              Boolean(schedule.taskId),
          )
          .map((schedule) => [schedule.taskId, schedule] as const)
      : [],
  );
  const baselineByTaskId = new Map(
    activeBaseline?.status === "approved" && activeBaseline.isCurrent
      ? (activeBaseline.tasks ?? [])
          .filter(
            (task): task is typeof task & { taskId: string } =>
              Boolean(task.taskId),
          )
          .map((task) => [task.taskId, task] as const)
      : [],
  );

  return tasks
    .filter((task) => task.taskKind !== "summary")
    .map((task) => {
      const forecast = forecastByTaskId.get(task.id);
      const baseline = baselineByTaskId.get(task.id);
      const targetFinish = task.plannedEndDate ?? null;
      const actualFinish = task.actualEndDate ?? null;
      const forecastFinish = forecast?.scheduledEndDate ?? null;
      const isComplete = task.status === "done";
      const varianceSource =
        isComplete && actualFinish && targetFinish
          ? "Actual"
          : !isComplete && forecastFinish && targetFinish
            ? "Forecast"
            : null;
      const varianceDate =
        varianceSource === "Actual"
          ? actualFinish
          : varianceSource === "Forecast"
            ? forecastFinish
            : null;

      return {
        actualFinish,
        actualStart: task.actualStartDate ?? null,
        baselineFinish: baseline?.plannedEndDate ?? null,
        baselineStart: baseline?.plannedStartDate ?? null,
        forecastFinish,
        forecastStart: forecast?.scheduledStartDate ?? null,
        presentationStatus: getPresentationStatus(task, targetFinish, todayDate),
        progress: clampPercent(getDisplayedPercentComplete(task)),
        targetFinish,
        targetStart: task.plannedStartDate ?? null,
        task,
        varianceDays:
          targetFinish && varianceDate
            ? diffDays(targetFinish, varianceDate)
            : null,
        varianceSource,
      } satisfies DeliveryTimelineRow;
    })
    .sort(compareTimelineRows);
}

export function buildDeliveryTimelineSummary(
  rows: readonly DeliveryTimelineRow[],
  currentForecast?: ApiForecastSnapshotDetail | null,
): DeliveryTimelineSummary {
  const standardRows = rows.filter((row) => row.task.taskKind !== "milestone");
  const completionRows = standardRows.length > 0 ? standardRows : rows;
  const completionPercent =
    completionRows.length > 0
      ? Math.round(
          completionRows.reduce((total, row) => total + row.progress, 0) /
            completionRows.length,
        )
      : 0;
  const targetFinish = latestDate(rows.map((row) => row.targetFinish));
  const currentForecastFinish =
    currentForecast?.snapshot.calculationStatus === "calculated"
      ? currentForecast.snapshot.projectFinishDate
      : null;

  return {
    completionPercent,
    currentForecastFinish,
    targetFinish,
    varianceDays:
      targetFinish && currentForecastFinish
        ? diffDays(targetFinish, currentForecastFinish)
        : null,
  };
}

function getPresentationStatus(
  task: ApiTask,
  targetFinish: string | null,
  todayDate: string,
): DeliveryPresentationStatus {
  if (task.status === "done") return "Complete";
  if (targetFinish && targetFinish < todayDate) return "Late";
  if (task.status === "blocked") return "At risk";
  if (task.status === "in_progress") return "In progress";
  return "Not started";
}

function compareTimelineRows(
  left: DeliveryTimelineRow,
  right: DeliveryTimelineRow,
) {
  const leftSequence = left.task.sequenceNumber;
  const rightSequence = right.task.sequenceNumber;
  if (leftSequence != null || rightSequence != null) {
    if (leftSequence == null) return 1;
    if (rightSequence == null) return -1;
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
  }
  const leftDate = left.targetStart ?? left.targetFinish;
  const rightDate = right.targetStart ?? right.targetFinish;
  if (!leftDate && !rightDate) {
    return left.task.title.localeCompare(right.task.title);
  }
  if (!leftDate) return 1;
  if (!rightDate) return -1;
  return leftDate.localeCompare(rightDate);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function latestDate(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}
