import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import type { ApiPlanningWorkspace } from "@/lib/api/client";

const workspace: ApiPlanningWorkspace = {
  criticalPathTaskIds: ["task-2"],
  dependencies: [
    {
      dependencyType: "FS",
      id: "dep-1",
      lagDays: 0,
      predecessorTaskId: "task-2",
      successorTaskId: "task-3",
    },
  ],
  project: {
    id: "project-1",
    name: "ERP Modernization",
    status: "active",
  },
  resourceAllocations: [
    {
      allocationPercent: 60,
      id: "allocation-1",
      projectId: "project-1",
      taskId: "task-2",
      user: {
        email: "alice@example.com",
        firstName: "Alice",
        id: "user-1",
        lastName: "Ng",
        status: "active",
      },
      userId: "user-1",
    },
  ],
  schedules: [
    {
      durationDays: 9,
      id: "schedule-1",
      isCritical: false,
      parentTaskId: null,
      percentComplete: 20,
      plannedFinishDate: "2026-07-10",
      plannedStartDate: "2026-07-01",
      projectId: "project-1",
      sequenceNumber: 1,
      snapshotId: "snapshot-1",
      taskId: "task-1",
      taskKind: "summary",
      taskTitle: "Planning",
    },
    {
      durationDays: 4,
      id: "schedule-2",
      isCritical: true,
      parentTaskId: "task-1",
      percentComplete: 50,
      plannedFinishDate: "2026-07-05",
      plannedStartDate: "2026-07-01",
      projectId: "project-1",
      sequenceNumber: 1,
      snapshotId: "snapshot-1",
      task: {
        assignee: {
          email: "alice@example.com",
          firstName: "Alice",
          id: "user-1",
          lastName: "Ng",
          status: "active",
        },
        id: "task-2",
        priority: "medium",
        projectId: "project-1",
        status: "in_progress",
        title: "Design schedule",
      },
      taskId: "task-2",
      taskKind: "standard",
      taskTitle: "Design schedule",
    },
    {
      durationDays: 0,
      id: "schedule-3",
      isCritical: false,
      parentTaskId: "task-1",
      percentComplete: 0,
      plannedFinishDate: "2026-07-06",
      plannedStartDate: "2026-07-06",
      projectId: "project-1",
      sequenceNumber: 2,
      snapshotId: "snapshot-1",
      taskId: "task-3",
      taskKind: "milestone",
      taskTitle: "Gate approved",
    },
  ],
  snapshot: {
    criticalPathTaskIds: ["task-2"],
    id: "snapshot-1",
    projectCompletionPercent: 25,
    projectFinishDate: "2026-07-10",
    projectId: "project-1",
    projectStartDate: "2026-07-01",
    versionNumber: 1,
  },
};

describe("PlanningWorkspace", () => {
  it("renders hierarchy, Gantt, critical path and allocations", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    expect(
      screen.getByText("ERP Modernization planning workspace"),
    ).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getByText("Design schedule")).toBeInTheDocument();
    expect(screen.getByText("Alice Ng 60%")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Interactive Gantt timeline"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Milestone Gate approved"),
    ).toBeInTheDocument();
  });

  it("collapses and expands summary rows", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    expect(screen.queryByText("Design schedule")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand planning/i }));
    expect(screen.getByText("Design schedule")).toBeInTheDocument();
  });

  it("falls back to the task title when the planning title is blank", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={{
          ...workspace,
          dependencies: [],
          resourceAllocations: [],
          schedules: [
            {
              ...workspace.schedules[1],
              parentTaskId: null,
              task: {
                ...workspace.schedules[1].task,
                title: "Recovered task title",
              },
              taskTitle: "",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Recovered task title")).toBeInTheDocument();
    expect(screen.getByTitle("Recovered task title")).toBeInTheDocument();
  });

  it("creates a sibling task, renders it immediately, and focuses the name", async () => {
    const newSchedule = {
      ...workspace.schedules[1],
      id: "schedule-4",
      parentTaskId: "task-1",
      sequenceNumber: 3,
      task: {
        ...workspace.schedules[1].task,
        id: "task-4",
        title: "New Task",
      },
      taskId: "task-4",
      taskTitle: "New Task",
    };
    const onCreateTask = vi.fn().mockResolvedValue(newSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] =
        React.useState(workspace);
      return (
        <PlanningWorkspace
          onCreateDependency={vi.fn()}
          onCreateTask={async (input) => {
            const schedule = await onCreateTask(input);
            setCurrentWorkspace((current) => ({
              ...current,
              schedules: [...current.schedules, schedule],
            }));
            return schedule;
          }}
          onDeleteDependency={vi.fn()}
          onUpdateSchedule={vi.fn()}
          workspace={currentWorkspace}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByText("Design schedule"));
    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));

    expect(onCreateTask).toHaveBeenCalledWith({ parentTaskId: "task-1" });
    expect(await screen.findByTitle("New Task")).toHaveFocus();
  });

  it("saves inline task name edits with Enter and updates the row locally", async () => {
    const updatedSchedule = {
      ...workspace.schedules[1],
      task: {
        ...workspace.schedules[1].task,
        title: "Build delivery plan",
      },
      taskTitle: "Build delivery plan",
    };
    const onUpdateSchedule = vi.fn().mockResolvedValue(updatedSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] =
        React.useState(workspace);
      return (
        <PlanningWorkspace
          onCreateDependency={vi.fn()}
          onCreateTask={vi.fn()}
          onDeleteDependency={vi.fn()}
          onUpdateSchedule={async (taskId, input) => {
            const schedule = await onUpdateSchedule(taskId, input);
            setCurrentWorkspace((current) => ({
              ...current,
              schedules: current.schedules.map((candidate) =>
                candidate.taskId === schedule.taskId ? schedule : candidate,
              ),
            }));
            return schedule;
          }}
          workspace={currentWorkspace}
        />
      );
    }

    render(<Harness />);

    fireEvent.doubleClick(screen.getByTitle("Design schedule"));
    fireEvent.change(screen.getByDisplayValue("Design schedule"), {
      target: { value: "Build delivery plan" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("Build delivery plan"), {
      key: "Enter",
    });

    expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
      taskTitle: "Build delivery plan",
    });
    expect(await screen.findByText("Build delivery plan")).toBeInTheDocument();
  });

  it("blocks invalid inline progress edits", () => {
    const onUpdateSchedule = vi.fn();
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={workspace}
      />,
    );

    fireEvent.doubleClick(screen.getByText("50%"));
    fireEvent.change(screen.getByDisplayValue("50"), {
      target: { value: "125" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("125"), { key: "Enter" });

    expect(screen.getByText("Progress must be between 0 and 100.")).toBeInTheDocument();
    expect(onUpdateSchedule).not.toHaveBeenCalled();
  });

  it("submits dependency creation and deletion", async () => {
    const onCreateDependency = vi.fn().mockResolvedValue(undefined);
    const onCreateTask = vi.fn();
    const onDeleteDependency = vi.fn().mockResolvedValue(undefined);
    render(
      <PlanningWorkspace
        onCreateDependency={onCreateDependency}
        onCreateTask={onCreateTask}
        onDeleteDependency={onDeleteDependency}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.change(screen.getByLabelText(/type/i), {
      target: { value: "SS" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add dependency/i }));

    expect(onCreateDependency).toHaveBeenCalledWith(
      expect.objectContaining({ dependencyType: "SS" }),
    );

    const dependencyRow = screen
      .getByText(/Design schedule → Gate approved/)
      .closest("div");
    fireEvent.click(
      within(dependencyRow as HTMLElement).getByRole("button", {
        name: /delete/i,
      }),
    );
    expect(onDeleteDependency).toHaveBeenCalledWith("dep-1");
  });

  it("updates task dates when a bar is dragged", async () => {
    const onUpdateSchedule = vi.fn().mockResolvedValue(undefined);
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={workspace}
      />,
    );

    const bar = screen.getByLabelText("Move Design schedule");
    fireEvent(
      bar,
      new MouseEvent("pointerdown", {
        bubbles: true,
        clientX: 100,
      }),
    );
    fireEvent(
      screen.getByLabelText("Interactive Gantt timeline"),
      new MouseEvent("pointerup", {
        bubbles: true,
        clientX: 160,
      }),
    );

    expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
      plannedFinishDate: "2026-07-12",
      plannedStartDate: "2026-07-08",
    });
  });
});
