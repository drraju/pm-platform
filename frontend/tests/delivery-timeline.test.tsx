import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeliveryTimeline } from "@/components/delivery/delivery-timeline";
import { buildDeliveryTimelineRows } from "@/components/delivery/delivery-timeline-model";
import type {
  ApiForecastSnapshotDetail,
  ApiProjectBaseline,
  ApiTask,
} from "@/lib/api/client";

const tasks: ApiTask[] = [
  task({
    actualEndDate: "2026-09-12",
    actualStartDate: "2026-09-02",
    id: "complete",
    percentComplete: 100,
    plannedEndDate: "2026-09-10",
    plannedStartDate: "2026-09-01",
    status: "done",
    title: "Completed release",
  }),
  task({
    actualStartDate: "2026-09-11",
    id: "progress",
    percentComplete: 45,
    plannedEndDate: "2026-09-25",
    plannedStartDate: "2026-09-10",
    status: "in_progress",
    title: "Migration build",
  }),
  task({
    id: "not-started",
    percentComplete: 0,
    plannedEndDate: "2026-10-03",
    plannedStartDate: "2026-09-27",
    status: "todo",
    title: "Operational handover",
  }),
  task({
    id: "missing-actual",
    percentComplete: 70,
    plannedEndDate: "2026-09-30",
    plannedStartDate: "2026-09-20",
    status: "in_progress",
    title: "No fabricated actual dates",
  }),
  task({
    actualEndDate: "2026-10-05",
    actualStartDate: "2026-10-05",
    id: "milestone",
    percentComplete: 100,
    plannedEndDate: "2026-10-04",
    plannedStartDate: "2026-10-04",
    status: "done",
    taskKind: "milestone",
    title: "Go live",
  }),
];

describe("DeliveryTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders target, actual progress, official forecast, baseline, milestone, and Today layers", () => {
    render(
      <DeliveryTimeline
        activeBaseline={baseline()}
        currentForecast={forecast()}
        tasks={tasks}
      />,
    );

    expect(screen.getByLabelText("Project delivery summary")).toHaveTextContent(
      "Overall completion54%",
    );
    expect(screen.getByLabelText("Project delivery summary")).toHaveTextContent(
      "Current forecast08 Oct",
    );
    expect(screen.getByTestId("target-bar-progress")).toHaveAttribute(
      "data-start-date",
      "2026-09-10",
    );
    expect(screen.getByTestId("target-bar-progress")).toHaveAttribute(
      "data-finish-date",
      "2026-09-25",
    );
    expect(screen.getByTestId("actual-progress-progress")).toHaveAttribute(
      "data-actual-start",
      "2026-09-11",
    );
    expect(screen.getByTestId("actual-progress-complete")).toHaveAttribute(
      "data-actual-finish",
      "2026-09-12",
    );
    expect(screen.getByTestId("actual-finish-complete")).toBeInTheDocument();
    expect(screen.getByTestId("forecast-bar-progress")).toHaveAttribute(
      "data-finish-date",
      "2026-10-01",
    );
    expect(screen.getByTestId("baseline-bar-progress")).toBeInTheDocument();
    expect(screen.getByTestId("target-milestone-milestone")).toBeInTheDocument();
    expect(screen.getByTestId("actual-milestone-milestone")).toBeInTheDocument();
    expect(screen.getByTestId("today-marker")).toBeInTheDocument();

    expect(screen.getAllByText("Complete")).toHaveLength(2);
    expect(screen.getAllByText("In progress")).toHaveLength(2);
    expect(screen.getByText("Not started")).toBeInTheDocument();
    expect(screen.queryByTestId("actual-progress-missing-actual")).not.toBeInTheDocument();
  });

  it("provides accessible task details without scheduling controls", () => {
    render(
      <DeliveryTimeline
        activeBaseline={baseline()}
        currentForecast={forecast()}
        tasks={tasks}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Migration build" }));
    const details = screen.getByRole("region", {
      name: "Timeline details for Migration build",
    });
    expect(details).toHaveTextContent("Target start10 Sep");
    expect(details).toHaveTextContent("Actual start11 Sep");
    expect(details).not.toHaveTextContent("Actual finish");
    expect(details).toHaveTextContent("Forecast finish01 Oct");
    expect(details).toHaveTextContent("Variance+6 days (Forecast)");
    expect(details).toHaveTextContent("Baseline finish24 Sep");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /schedule|resize|delete/i })).not.toBeInTheDocument();
  });

  it("never treats due date or execution target as Target and never fabricates actual dates", () => {
    const semanticTask = task({
      dueDate: "2026-09-22",
      id: "semantic",
      latestExecutionUpdate: {
        id: "update-1",
        nextStep: null,
        percentComplete: 100,
        priority: "medium",
        projectId: "project-1",
        status: "done",
        targetCompletionDate: "2026-09-23",
        taskId: "semantic",
        updateNotes: "Done",
        updatedById: "user-1",
        updatedOn: "2026-09-18T10:00:00Z",
      },
      percentComplete: 100,
      status: "done",
      title: "Semantic guard",
    });

    render(<DeliveryTimeline tasks={[semanticTask]} />);

    expect(screen.queryByTestId("target-bar-semantic")).not.toBeInTheDocument();
    expect(screen.queryByTestId("actual-progress-semantic")).not.toBeInTheDocument();
    expect(screen.queryByTestId("actual-finish-semantic")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Semantic guard" }));
    const details = screen.getByRole("region", {
      name: "Timeline details for Semantic guard",
    });
    expect(within(details).queryByText("Target finish")).not.toBeInTheDocument();
    expect(within(details).queryByText("Actual finish")).not.toBeInTheDocument();
    expect(details).not.toHaveTextContent("22 Sep");
    expect(details).not.toHaveTextContent("23 Sep");
  });

  it("degrades to Target and Actual when Forecast and Baseline are missing", () => {
    render(<DeliveryTimeline tasks={tasks.slice(0, 2)} />);

    expect(screen.getByTestId("target-bar-progress")).toBeInTheDocument();
    expect(screen.getByTestId("actual-progress-progress")).toBeInTheDocument();
    expect(screen.queryByTestId("forecast-bar-progress")).not.toBeInTheDocument();
    expect(screen.queryByTestId("baseline-bar-progress")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Project delivery summary")).toHaveTextContent(
      "Current forecastNot available",
    );
  });

  it("joins snapshots by task ID and ignores deleted or null historical task IDs", () => {
    const sourceForecast = forecast();
    const joinedForecast: ApiForecastSnapshotDetail = {
      ...sourceForecast,
      taskSchedules: [
        ...sourceForecast.taskSchedules,
        schedule("deleted-task", "Deleted task", "2026-09-01", "2027-12-31"),
        schedule(null, "Deleted without ID", "2026-09-01", "2028-12-31"),
      ],
    };

    render(
      <DeliveryTimeline currentForecast={joinedForecast} tasks={[tasks[1]]} />,
    );

    expect(screen.getByTestId("forecast-bar-progress")).toHaveAttribute(
      "data-finish-date",
      "2026-10-01",
    );
    expect(screen.queryByText("Deleted task")).not.toBeInTheDocument();
    expect(screen.queryByText("Deleted without ID")).not.toBeInTheDocument();
  });
});

describe("delivery timeline variance", () => {
  it("uses Actual for completed work and official Forecast for incomplete work", () => {
    const rows = buildDeliveryTimelineRows({
      currentForecast: forecast(),
      tasks: tasks.slice(0, 2),
      todayDate: "2026-09-18",
    });

    expect(rows.find((row) => row.task.id === "complete")).toMatchObject({
      varianceDays: 2,
      varianceSource: "Actual",
    });
    expect(rows.find((row) => row.task.id === "progress")).toMatchObject({
      varianceDays: 6,
      varianceSource: "Forecast",
    });
  });

  it("shows no variance when authoritative date pairs are incomplete", () => {
    const [row] = buildDeliveryTimelineRows({
      currentForecast: forecast(),
      tasks: [task({ id: "no-target", status: "done", title: "No target" })],
      todayDate: "2026-09-18",
    });
    expect(row.varianceDays).toBeNull();
    expect(row.varianceSource).toBeNull();
  });
});

function task(overrides: Partial<ApiTask>): ApiTask {
  return {
    id: "task",
    percentComplete: 0,
    priority: "medium",
    projectId: "project-1",
    status: "todo",
    taskKind: "standard",
    title: "Task",
    ...overrides,
  };
}

function forecast(): ApiForecastSnapshotDetail {
  return {
    snapshot: {
      calculatedAt: "2026-09-18T08:00:00Z",
      calculationStatus: "calculated",
      criticalTaskCount: 1,
      generatedBy: null,
      isCurrent: true,
      milestoneCount: 1,
      projectFinishDate: "2026-10-08",
      projectId: "project-1",
      projectStartDate: "2026-09-01",
      scheduleAnchorDate: "2026-09-18",
      scheduleVersion: 4,
      snapshotId: "forecast-4",
      taskCount: 5,
      unscheduledExecutableTaskCount: 0,
    },
    taskSchedules: [
      schedule("complete", "Completed release", "2026-09-01", "2026-09-11"),
      schedule("progress", "Migration build", "2026-09-11", "2026-10-01"),
      schedule("not-started", "Operational handover", "2026-09-28", "2026-10-08"),
      schedule("missing-actual", "No fabricated actual dates", "2026-09-20", "2026-10-02"),
      {
        ...schedule("milestone", "Go live", "2026-10-06", "2026-10-06"),
        milestoneCategory: "go_live",
        taskKind: "milestone",
      },
    ],
  };
}

function schedule(
  taskId: string | null,
  taskTitle: string,
  scheduledStartDate: string,
  scheduledEndDate: string,
): ApiForecastSnapshotDetail["taskSchedules"][number] {
  return {
    durationDays: 1,
    isCritical: false,
    milestoneCategory: null,
    parentTaskId: null,
    scheduledEndDate,
    scheduledStartDate,
    sequenceNumber: null,
    taskId,
    taskKind: "standard",
    taskTitle,
  };
}

function baseline(): ApiProjectBaseline {
  return {
    capturedAt: "2026-09-01T08:00:00Z",
    capturedById: "user-1",
    id: "baseline-1",
    isCurrent: true,
    name: "Approved baseline",
    projectId: "project-1",
    status: "approved",
    tasks: tasks.map((item, index) => ({
      id: `baseline-task-${index}`,
      milestoneCategory: item.milestoneCategory,
      plannedEndDate:
        item.id === "progress" ? "2026-09-24" : item.plannedEndDate,
      plannedStartDate: item.plannedStartDate,
      projectBaselineId: "baseline-1",
      projectId: "project-1",
      taskId: item.id,
      taskKind: item.taskKind ?? "standard",
      taskTitle: item.title,
    })),
    versionNumber: 1,
  };
}
