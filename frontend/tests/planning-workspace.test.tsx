import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
      milestoneCategory: "release",
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

const orderingWorkspace: ApiPlanningWorkspace = {
  ...workspace,
  criticalPathTaskIds: [],
  dependencies: [],
  resourceAllocations: [],
  schedules: [
    workspace.schedules[0],
    workspace.schedules[1],
    workspace.schedules[2],
    {
      ...workspace.schedules[1],
      id: "schedule-4",
      isCritical: false,
      parentTaskId: null,
      sequenceNumber: 2,
      task: {
        ...workspace.schedules[1].task,
        id: "task-4",
        title: "Execution",
      },
      taskId: "task-4",
      taskKind: "standard",
      taskTitle: "Execution",
    },
    {
      ...workspace.schedules[1],
      id: "schedule-5",
      isCritical: false,
      parentTaskId: null,
      sequenceNumber: 3,
      task: {
        ...workspace.schedules[1].task,
        id: "task-5",
        title: "Closure",
      },
      taskId: "task-5",
      taskKind: "standard",
      taskTitle: "Closure",
    },
  ],
};

const nestedWorkspace: ApiPlanningWorkspace = {
  ...workspace,
  criticalPathTaskIds: [],
  dependencies: [],
  resourceAllocations: [],
  schedules: [
    {
      ...workspace.schedules[0],
      id: "nested-schedule-1",
      parentTaskId: null,
      sequenceNumber: 1,
      taskId: "phase-1",
      taskTitle: "Phase 1",
    },
    {
      ...workspace.schedules[0],
      id: "nested-schedule-2",
      parentTaskId: "phase-1",
      sequenceNumber: 1,
      taskId: "development",
      taskTitle: "Development",
    },
    {
      ...workspace.schedules[1],
      id: "nested-schedule-3",
      parentTaskId: "development",
      sequenceNumber: 1,
      task: {
        ...workspace.schedules[1].task,
        id: "backend",
        title: "Backend",
      },
      taskId: "backend",
      taskTitle: "Backend",
    },
    {
      ...workspace.schedules[1],
      id: "nested-schedule-4",
      parentTaskId: "development",
      sequenceNumber: 2,
      task: {
        ...workspace.schedules[1].task,
        id: "frontend",
        title: "Frontend",
      },
      taskId: "frontend",
      taskTitle: "Frontend",
    },
    {
      ...workspace.schedules[1],
      id: "nested-schedule-5",
      parentTaskId: "phase-1",
      sequenceNumber: 2,
      task: {
        ...workspace.schedules[1].task,
        id: "testing",
        title: "Testing",
      },
      taskId: "testing",
      taskTitle: "Testing",
    },
    {
      ...workspace.schedules[1],
      id: "nested-schedule-6",
      parentTaskId: null,
      sequenceNumber: 2,
      task: {
        ...workspace.schedules[1].task,
        id: "phase-2",
        title: "Phase 2",
      },
      taskId: "phase-2",
      taskTitle: "Phase 2",
    },
  ],
};

const milestoneCategoryWorkspace: ApiPlanningWorkspace = {
  ...workspace,
  dependencies: [],
  resourceAllocations: [],
  schedules: [
    {
      ...workspace.schedules[2],
      milestoneCategory: "standard",
      parentTaskId: null,
      taskId: "standard-ms",
      taskTitle: "Standard checkpoint",
    },
    {
      ...workspace.schedules[2],
      milestoneCategory: "release",
      parentTaskId: null,
      sequenceNumber: 2,
      taskId: "release-ms",
      taskTitle: "Release checkpoint",
    },
    {
      ...workspace.schedules[2],
      milestoneCategory: "drop",
      parentTaskId: null,
      sequenceNumber: 3,
      taskId: "drop-ms",
      taskTitle: "Drop checkpoint",
    },
    {
      ...workspace.schedules[2],
      milestoneCategory: "go_live",
      parentTaskId: null,
      sequenceNumber: 4,
      taskId: "go-live-ms",
      taskTitle: "Go Live checkpoint",
    },
    {
      ...workspace.schedules[2],
      milestoneCategory: "decision",
      parentTaskId: null,
      sequenceNumber: 5,
      taskId: "decision-ms",
      taskTitle: "Decision checkpoint",
    },
  ],
};

function dragRow(sourceName: RegExp, targetName: RegExp) {
  const dataTransfer = {
    dropEffect: "move",
    effectAllowed: "move",
    getData: vi.fn(),
    setData: vi.fn(),
  };
  fireEvent.dragStart(screen.getByRole("row", { name: sourceName }), {
    dataTransfer,
  });
  fireEvent.dragOver(screen.getByRole("row", { name: targetName }), {
    dataTransfer,
  });
  fireEvent.drop(screen.getByRole("row", { name: targetName }), {
    dataTransfer,
  });
}

function openAddMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("PlanningWorkspace", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("renders task, summary, milestone and category affordances", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    expect(screen.getAllByText("Type").length).toBeGreaterThan(0);
    const summaryRow = screen.getByRole("row", { name: /1 Planning/ });
    const taskRow = screen.getByRole("row", { name: /1\.1 Design schedule/ });
    const milestoneRow = screen.getByRole("row", { name: /1\.2 Gate approved/ });

    expect(within(summaryRow).getByText("Summary")).toBeInTheDocument();
    expect(within(summaryRow).getByText("Calculated")).toBeInTheDocument();
    expect(within(taskRow).getByText("Task")).toBeInTheDocument();
    expect(within(milestoneRow).getByText("Release")).toBeInTheDocument();
    expect(within(milestoneRow).getByText("Same date")).toBeInTheDocument();
  });

  it("renders all milestone category badges", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={milestoneCategoryWorkspace}
      />,
    );

    expect(screen.getByText("Milestone")).toBeInTheDocument();
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(screen.getByText("Drop")).toBeInTheDocument();
    expect(screen.getByText("Go Live")).toBeInTheDocument();
    expect(screen.getByText("Decision")).toBeInTheDocument();
  });

  it("keeps calculated summary schedule fields read-only", () => {
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

    const summaryRow = screen.getByRole("row", { name: /1 Planning/ });
    fireEvent.doubleClick(within(summaryRow).getByText("20%"));

    expect(screen.queryByDisplayValue("20")).not.toBeInTheDocument();
    expect(onUpdateSchedule).not.toHaveBeenCalled();
  });

  it("keeps the toolbar sticky and the planning workspace independently scrollable", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const toolbar = screen.getByLabelText("Planning toolbar");
    expect(toolbar).toHaveClass("sticky");
    const scrollableWorkspace = screen.getByLabelText("Scrollable planning workspace");
    expect(scrollableWorkspace).toHaveClass("overflow-auto");
    expect(
      screen.getByLabelText("Interactive Gantt timeline").parentElement,
    ).not.toHaveClass("overflow-x-auto");

    const addButton = within(toolbar).getByRole("button", { name: "Add" });
    expect(addButton).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(addButton);
    expect(within(toolbar).getByRole("menuitem", { name: "Task" })).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("menuitem", { name: "Child Task" }),
    ).toBeDisabled();
    expect(within(toolbar).getByRole("menuitem", { name: "Summary" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("menuitem", { name: "Release" })).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Dependencies" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Fit to Project" }),
    ).toBeInTheDocument();
    expect(within(toolbar).getByLabelText("Time Scale")).toBeInTheDocument();
  });

  it("enables child creation only for selected summary rows", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByRole("row", { name: /1 Planning/ }));
    openAddMenu();
    expect(screen.getByRole("menuitem", { name: "Child Task" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("row", { name: /1\.2 Gate approved/ }));
    openAddMenu();
    expect(screen.getByRole("menuitem", { name: "Child Task" })).toBeDisabled();
  });

  it("shows milestone state instead of editable progress and workflow status", () => {
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

    const milestoneRow = screen.getByRole("row", { name: /1\.2 Gate approved/ });
    expect(within(milestoneRow).getAllByText("Pending")).toHaveLength(2);

    fireEvent.doubleClick(within(milestoneRow).getAllByText("Pending")[0]);
    expect(screen.queryByDisplayValue("0")).not.toBeInTheDocument();
    expect(onUpdateSchedule).not.toHaveBeenCalled();
  });

  it("expands and collapses all summary tasks from the toolbar", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={nestedWorkspace}
      />,
    );

    expect(screen.getByRole("row", { name: /1\.1\.1 Backend/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse All" }));

    expect(screen.getByRole("row", { name: /1 Phase 1/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Phase 2/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Development/ })).not.toBeInTheDocument();
    expect(screen.getByText("Visible Tasks: 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand All" }));

    expect(screen.getByRole("row", { name: /1\.1\.1 Backend/ })).toBeInTheDocument();
    expect(screen.getByText("Visible Tasks: 6")).toBeInTheDocument();
  });

  it("uses current project members in the assignment dropdown and autosaves selection", async () => {
    const onUpdateSchedule = vi.fn().mockResolvedValue(workspace.schedules[1]);

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        projectMembers={[
          {
            id: "member-2",
            role: "contributor",
            user: {
              email: "bob@example.com",
              firstName: "Bob",
              id: "user-2",
              lastName: "Stone",
              status: "active",
            },
            userId: "user-2",
          },
        ]}
        workspace={workspace}
      />,
    );

    fireEvent.doubleClick(screen.getByTitle("Alice Ng"));
    const ownerSelect = screen
      .getByRole("option", { name: "Bob Stone" })
      .closest("select");
    expect(ownerSelect).not.toBeNull();
    expect(screen.getByRole("option", { name: "Bob Stone" })).toBeInTheDocument();
    fireEvent.change(ownerSelect as HTMLSelectElement, {
      target: { value: "user-2" },
    });

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
        ownerId: "user-2",
      });
    });
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

  it("supports nested WBS collapse and expand without changing numbering", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={nestedWorkspace}
      />,
    );

    expect(screen.getByRole("row", { name: /1 Phase 1/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /1\.1 Development/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /1\.1\.1 Backend/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /1\.2 Testing/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse development/i }));
    expect(screen.queryByRole("row", { name: /1\.1\.1 Backend/ })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /1\.2 Testing/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse phase 1/i }));
    expect(screen.queryByRole("row", { name: /1\.1 Development/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /1\.2 Testing/ })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Phase 2/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand phase 1/i }));
    expect(screen.getByRole("row", { name: /1\.1 Development/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /1\.1\.1 Backend/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand development/i }));
    expect(screen.getByRole("row", { name: /1\.1\.1 Backend/ })).toBeInTheDocument();
  });

  it("does not render expand or collapse controls for leaf tasks", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const leafRow = screen.getByRole("row", { name: /1\.1 Design schedule/ });
    expect(
      within(leafRow).queryByRole("button", { name: /collapse design schedule/i }),
    ).not.toBeInTheDocument();
    expect(
      within(leafRow).queryByRole("button", { name: /expand design schedule/i }),
    ).not.toBeInTheDocument();
  });

  it("supports ArrowLeft and ArrowRight on focused summary rows", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const summaryRow = screen.getByRole("row", { name: /1 Planning/ });
    fireEvent.keyDown(summaryRow, { key: "ArrowLeft" });
    expect(screen.queryByRole("row", { name: /1\.1 Design schedule/ })).not.toBeInTheDocument();

    fireEvent.keyDown(summaryRow, { key: "ArrowRight" });
    expect(screen.getByRole("row", { name: /1\.1 Design schedule/ })).toBeInTheDocument();
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
    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Task" }));

    expect(onCreateTask).toHaveBeenCalledWith({
      parentTaskId: "task-1",
      taskType: "task",
    });
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

  it("edits milestone rows with a single date editor", async () => {
    const onUpdateSchedule = vi.fn().mockResolvedValue(workspace.schedules[2]);
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={workspace}
      />,
    );

    const milestoneRow = screen.getByRole("row", { name: /Gate approved/ });
    fireEvent.doubleClick(within(milestoneRow).getByText("07-06"));
    fireEvent.change(screen.getByDisplayValue("2026-07-06"), {
      target: { value: "2026-07-08" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("2026-07-08"), {
      key: "Enter",
    });

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("task-3", {
        plannedStartDate: "2026-07-08",
      });
    });
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

  it("zooms in to a finer timeline scale", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom In" }));

    expect(screen.getByLabelText("Time Scale")).toHaveValue("day");
  });

  it("zooms out to a broader timeline scale", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom Out" }));

    expect(screen.getByLabelText("Time Scale")).toHaveValue("month");
  });

  it("switches timeline scale from the selector", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.change(screen.getByLabelText("Time Scale"), {
      target: { value: "quarter" },
    });

    expect(screen.getByLabelText("Time Scale")).toHaveValue("quarter");
    expect(screen.getByText(/Q3 2026/)).toBeInTheDocument();
  });

  it("fits the project to the visible Gantt area", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fit to Project" }));

    expect(screen.getByLabelText("Time Scale")).toHaveValue("quarter");
  });

  it("scrolls horizontally to today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T00:00:00Z"));
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const scrollableWorkspace = screen.getByLabelText(
      "Scrollable planning workspace",
    ) as HTMLElement;
    Object.defineProperty(scrollableWorkspace, "clientWidth", {
      configurable: true,
      value: 1400,
    });

    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(screen.getByLabelText("Today marker")).toBeInTheDocument();
    expect(scrollableWorkspace.scrollLeft).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Interactive Gantt timeline").parentElement
        ?.scrollLeft ?? 0,
    ).toBe(0);
    vi.useRealTimers();
  });

  it("continues saving dragged task dates after changing zoom", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Zoom In" }));
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
        clientX: 134,
      }),
    );

    expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
      plannedFinishDate: "2026-07-06",
      plannedStartDate: "2026-07-02",
    });
  });

  it("adds a top-level task at the end of the top-level task list", async () => {
    const newSchedule = {
      ...orderingWorkspace.schedules[3],
      id: "schedule-6",
      sequenceNumber: 4,
      task: {
        ...orderingWorkspace.schedules[3].task,
        id: "task-6",
        title: "New Task",
      },
      taskId: "task-6",
      taskTitle: "New Task",
    };
    const onCreateTask = vi.fn().mockResolvedValue(newSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] =
        React.useState(orderingWorkspace);
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

    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Task" }));

    expect(onCreateTask).toHaveBeenCalledWith({
      parentTaskId: null,
      taskType: "task",
    });
    expect(await screen.findByRole("row", { name: /4 New Task/ })).toBeInTheDocument();
    expect(screen.getByTitle("New Task")).toHaveFocus();
  });

  it("adds a child as the last child and expands the parent", async () => {
    const newSchedule = {
      ...orderingWorkspace.schedules[1],
      id: "schedule-6",
      parentTaskId: "task-1",
      sequenceNumber: 3,
      task: {
        ...orderingWorkspace.schedules[1].task,
        id: "task-6",
        title: "New Task",
      },
      taskId: "task-6",
      taskTitle: "New Task",
    };
    const onCreateTask = vi.fn().mockResolvedValue(newSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] =
        React.useState(orderingWorkspace);
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

    fireEvent.click(screen.getByRole("row", { name: /1 Planning/ }));
    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Child Task" }));

    expect(onCreateTask).toHaveBeenCalledWith({
      parentTaskId: "task-1",
      taskType: "task",
    });
    expect(await screen.findByRole("row", { name: /1\.3 New Task/ })).toBeInTheDocument();
    expect(screen.getByTitle("New Task")).toHaveFocus();
  });

  it("updates local row order and WBS when a row is reordered", async () => {
    const onUpdateSchedule = vi.fn().mockImplementation((taskId, input) =>
      Promise.resolve({
        ...orderingWorkspace.schedules.find(
          (schedule) => schedule.taskId === taskId,
        ),
        ...input,
      }),
    );
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={orderingWorkspace}
      />,
    );

    dragRow(/3 Closure/, /1 Planning/);

    expect(screen.getByRole("row", { name: /1 Closure/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Planning/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2\.1 Design schedule/ })).toBeInTheDocument();
  });

  it("rejects row drops onto milestones with a friendly validation message", async () => {
    const onUpdateSchedule = vi.fn();
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={orderingWorkspace}
      />,
    );

    dragRow(/3 Closure/, /1\.2 Gate approved/);

    expect(
      screen.getByText(
        "Milestones are scheduling events and cannot contain child tasks.",
      ),
    ).toBeInTheDocument();
    expect(onUpdateSchedule).not.toHaveBeenCalled();
  });

  it("keeps collapsed summary branches draggable without orphaning descendants", async () => {
    const onUpdateSchedule = vi.fn().mockImplementation((taskId, input) =>
      Promise.resolve({
        ...orderingWorkspace.schedules.find(
          (schedule) => schedule.taskId === taskId,
        ),
        ...input,
      }),
    );
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={orderingWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    expect(screen.queryByRole("row", { name: /1\.1 Design schedule/ })).not.toBeInTheDocument();

    dragRow(/1 Planning/, /3 Closure/);

    expect(screen.getByRole("row", { name: /1 Execution/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Closure/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /3 Planning/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /3\.1 Design schedule/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand planning/i }));
    expect(screen.getByRole("row", { name: /3\.1 Design schedule/ })).toBeInTheDocument();
    expect(onUpdateSchedule).not.toHaveBeenCalledWith(
      "task-2",
      expect.objectContaining({ parentTaskId: null }),
    );
  });

  it("persists row reorder sequence changes immediately", async () => {
    const onUpdateSchedule = vi.fn().mockImplementation((taskId, input) =>
      Promise.resolve({
        ...orderingWorkspace.schedules.find(
          (schedule) => schedule.taskId === taskId,
        ),
        ...input,
      }),
    );
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={orderingWorkspace}
      />,
    );

    dragRow(/3 Closure/, /1 Planning/);

    await waitFor(() => expect(onUpdateSchedule).toHaveBeenCalledTimes(3));
    expect(onUpdateSchedule).toHaveBeenCalledWith("task-5", {
      parentTaskId: null,
      sequenceNumber: 1,
    });
    expect(onUpdateSchedule).toHaveBeenCalledWith("task-1", {
      parentTaskId: null,
      sequenceNumber: 2,
    });
    expect(onUpdateSchedule).toHaveBeenCalledWith("task-4", {
      parentTaskId: null,
      sequenceNumber: 3,
    });
  });

  it("preserves ordering after a refreshed workspace is rendered", async () => {
    const onUpdateSchedule = vi.fn();

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] =
        React.useState(orderingWorkspace);
      const [refreshKey, setRefreshKey] = React.useState(0);
      return (
        <>
          <button onClick={() => setRefreshKey((key) => key + 1)} type="button">
            Refresh planning
          </button>
          <PlanningWorkspace
            key={refreshKey}
            onCreateDependency={vi.fn()}
            onCreateTask={vi.fn()}
            onDeleteDependency={vi.fn()}
            onUpdateSchedule={async (taskId, input) => {
              const originalSchedule = currentWorkspace.schedules.find(
                (schedule) => schedule.taskId === taskId,
              );
              const updatedSchedule = {
                ...originalSchedule,
                ...input,
              } as ApiPlanningWorkspace["schedules"][number];
              onUpdateSchedule(taskId, input);
              setCurrentWorkspace((current) => ({
                ...current,
                schedules: current.schedules.map((schedule) =>
                  schedule.taskId === taskId ? updatedSchedule : schedule,
                ),
              }));
              return updatedSchedule;
            }}
            workspace={currentWorkspace}
          />
        </>
      );
    }

    render(<Harness />);

    dragRow(/3 Closure/, /1 Planning/);
    await waitFor(() => expect(onUpdateSchedule).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole("button", { name: "Refresh planning" }));

    expect(screen.getByRole("row", { name: /1 Closure/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Planning/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /3 Execution/ })).toBeInTheDocument();
  });

  it("resets expansion state when the planning workspace remounts", () => {
    function Harness() {
      const [refreshKey, setRefreshKey] = React.useState(0);
      return (
        <>
          <button onClick={() => setRefreshKey((key) => key + 1)} type="button">
            Remount planning
          </button>
          <PlanningWorkspace
            key={refreshKey}
            onCreateDependency={vi.fn()}
            onCreateTask={vi.fn()}
            onDeleteDependency={vi.fn()}
            onUpdateSchedule={vi.fn()}
            workspace={workspace}
          />
        </>
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    expect(screen.queryByRole("row", { name: /1\.1 Design schedule/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remount planning" }));
    expect(screen.getByRole("row", { name: /1\.1 Design schedule/ })).toBeInTheDocument();
  });
});
