import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import type { ApiPlanningWorkspace, ApiProjectMember } from "@/lib/api/client";

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
      earlyFinish: null,
      earlyStart: null,
      freeFloatDays: null,
      id: "schedule-1",
      isCritical: false,
      lateFinish: null,
      lateStart: null,
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
      totalFloatDays: null,
    },
    {
      durationDays: 4,
      earlyFinish: 4,
      earlyStart: 0,
      freeFloatDays: 0,
      id: "schedule-2",
      isCritical: true,
      lateFinish: 4,
      lateStart: 0,
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
      totalFloatDays: 0,
    },
    {
      durationDays: 0,
      earlyFinish: 5,
      earlyStart: 5,
      freeFloatDays: 0,
      id: "schedule-3",
      isCritical: false,
      lateFinish: 5,
      lateStart: 5,
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
      totalFloatDays: 0,
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

const projectMembers: ApiProjectMember[] = [
  {
    id: "member-1",
    projectId: "project-1",
    role: "owner",
    user: {
      email: "alice@example.com",
      firstName: "Alice",
      id: "user-1",
      lastName: "Ng",
      status: "active",
    },
    userId: "user-1",
  },
  {
    id: "member-2",
    projectId: "project-1",
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
];

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

const longTimelineWorkspace: ApiPlanningWorkspace = {
  ...workspace,
  dependencies: [
    {
      dependencyType: "FS",
      id: "long-dep-1",
      lagDays: 0,
      predecessorTaskId: "long-task-1",
      successorTaskId: "long-task-2",
    },
  ],
  schedules: [
    {
      ...workspace.schedules[1],
      durationDays: 151,
      id: "long-schedule-1",
      parentTaskId: null,
      plannedFinishDate: "2026-05-31",
      plannedStartDate: "2026-01-01",
      sequenceNumber: 1,
      task: {
        ...workspace.schedules[1].task,
        id: "long-task-1",
        title: "Discovery",
      },
      taskId: "long-task-1",
      taskTitle: "Discovery",
    },
    {
      ...workspace.schedules[1],
      durationDays: 183,
      id: "long-schedule-2",
      isCritical: false,
      parentTaskId: null,
      plannedFinishDate: "2026-11-30",
      plannedStartDate: "2026-06-01",
      sequenceNumber: 2,
      task: {
        ...workspace.schedules[1].task,
        id: "long-task-2",
        title: "Delivery",
      },
      taskId: "long-task-2",
      taskTitle: "Delivery",
    },
    {
      ...workspace.schedules[2],
      id: "long-schedule-3",
      parentTaskId: null,
      plannedFinishDate: "2026-12-15",
      plannedStartDate: "2026-12-15",
      sequenceNumber: 3,
      taskId: "long-milestone-1",
      taskTitle: "Launch milestone",
    },
  ],
  snapshot: {
    ...workspace.snapshot,
    projectFinishDate: "2026-12-15",
    projectStartDate: "2026-01-01",
  },
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

const longTaskName =
  "Review PFM data, PCA data columns and customer incident history before stakeholder review";

const longTaskNameWorkspace: ApiPlanningWorkspace = {
  ...workspace,
  criticalPathTaskIds: [],
  dependencies: [],
  resourceAllocations: [],
  schedules: [
    {
      ...workspace.schedules[0],
      id: "long-summary-schedule",
      parentTaskId: null,
      sequenceNumber: 1,
      taskId: "long-summary",
      taskTitle:
        "Change pipelines to read from GraphQL and validate customer impact across all environments",
    },
    {
      ...workspace.schedules[1],
      id: "long-task-schedule",
      parentTaskId: "long-summary",
      sequenceNumber: 1,
      task: {
        ...workspace.schedules[1].task,
        id: "long-task",
        title: longTaskName,
      },
      taskId: "long-task",
      taskTitle: longTaskName,
    },
    {
      ...workspace.schedules[1],
      id: "long-subtask-schedule",
      parentTaskId: "long-task",
      sequenceNumber: 1,
      task: {
        ...workspace.schedules[1].task,
        id: "long-subtask",
        title:
          "End points are empty, pipeline is failing. Also validate whether the records are being generated correctly",
      },
      taskId: "long-subtask",
      taskTitle:
        "End points are empty, pipeline is failing. Also validate whether the records are being generated correctly",
    },
    {
      ...workspace.schedules[1],
      id: "short-task-schedule",
      parentTaskId: null,
      sequenceNumber: 2,
      task: {
        ...workspace.schedules[1].task,
        id: "short-task",
        title: "Short task",
      },
      taskId: "short-task",
      taskTitle: "Short task",
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

const wbsEditingWorkspace: ApiPlanningWorkspace = {
  ...workspace,
  criticalPathTaskIds: [],
  dependencies: [],
  resourceAllocations: [],
  schedules: [
    {
      ...workspace.schedules[0],
      id: "summary-planning",
      parentTaskId: null,
      plannedFinishDate: "2026-07-10",
      plannedStartDate: "2026-07-01",
      sequenceNumber: 1,
      taskId: "summary-1",
      taskTitle: "Planning",
    },
    {
      ...workspace.schedules[1],
      id: "task-design",
      parentTaskId: "summary-1",
      plannedFinishDate: "2026-07-05",
      plannedStartDate: "2026-07-01",
      sequenceNumber: 1,
      task: {
        ...workspace.schedules[1].task,
        id: "task-2",
        title: "Design schedule",
      },
      taskId: "task-2",
      taskTitle: "Design schedule",
    },
    {
      ...workspace.schedules[2],
      id: "milestone-release",
      parentTaskId: "summary-1",
      plannedFinishDate: "2026-07-06",
      plannedStartDate: "2026-07-06",
      sequenceNumber: 2,
      taskId: "task-3",
      taskTitle: "Gate approved",
    },
    {
      ...workspace.schedules[0],
      id: "summary-execution",
      parentTaskId: null,
      plannedFinishDate: "2026-07-20",
      plannedStartDate: "2026-07-08",
      sequenceNumber: 2,
      taskId: "summary-2",
      taskTitle: "Execution",
    },
    {
      ...workspace.schedules[1],
      id: "task-build-api",
      parentTaskId: "summary-2",
      plannedFinishDate: "2026-07-20",
      plannedStartDate: "2026-07-08",
      sequenceNumber: 1,
      task: {
        ...workspace.schedules[1].task,
        id: "task-4",
        title: "Build API",
      },
      taskId: "task-4",
      taskTitle: "Build API",
    },
    {
      ...workspace.schedules[0],
      id: "summary-empty",
      parentTaskId: null,
      plannedFinishDate: null,
      plannedStartDate: null,
      sequenceNumber: 3,
      taskId: "summary-3",
      taskTitle: "Empty Summary",
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

function getDraftPlanningRow() {
  return screen.getByRole("row", { name: /Draft planning row/ });
}

function submitDraftCreateRow({
  ownerId,
  title,
}: {
  ownerId?: string;
  title?: string;
} = {}) {
  const draftRow = getDraftPlanningRow();
  if (title !== undefined) {
    fireEvent.change(within(draftRow).getByRole("textbox"), {
      target: { value: title },
    });
  }
  if (ownerId !== undefined) {
    fireEvent.change(within(draftRow).getByRole("combobox"), {
      target: { value: ownerId },
    });
  }
  fireEvent.keyDown(within(draftRow).getByRole("textbox"), {
    key: "Enter",
  });
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

function ensureLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
}

function showColumns(...labels: string[]) {
  fireEvent.click(screen.getByRole("button", { name: /columns/i }));
  labels.forEach((label) => {
    fireEvent.click(screen.getByLabelText(label));
  });
  fireEvent.click(screen.getByRole("button", { name: /columns/i }));
}

function runStructureCommand(label: string) {
  fireEvent.click(screen.getByRole("button", { name: /^Structure/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: label }));
}

describe("PlanningWorkspace", () => {
  beforeEach(() => {
    ensureLocalStorage();
    window.localStorage.clear();
    setViewportWidth(1440);
  });

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
    const milestoneRow = screen.getByRole("row", {
      name: /1\.2 Gate approved/,
    });

    expect(
      within(summaryRow).getByLabelText("Task type: Summary"),
    ).toHaveAttribute(
      "title",
      "A Summary groups work and derives its schedule from child work.",
    );
    expect(
      within(summaryRow).getByRole("img", {
        name: "Calculated from child work",
      }),
    ).toBeInTheDocument();
    expect(
      within(taskRow).getByLabelText("Task type: Task"),
    ).toBeInTheDocument();
    expect(
      within(milestoneRow).getByLabelText("Task type: Release"),
    ).toBeInTheDocument();
    expect(within(milestoneRow).getByText("Same date")).toBeInTheDocument();
    expect(screen.queryByText("Priority")).not.toBeInTheDocument();
    expect(within(taskRow).queryByText("medium")).not.toBeInTheDocument();
    expect(screen.queryByText("Duration")).not.toBeInTheDocument();
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

    expect(screen.getByLabelText("Task type: Milestone")).toBeInTheDocument();
    expect(screen.getByLabelText("Task type: Release")).toBeInTheDocument();
    expect(screen.getByLabelText("Task type: Drop")).toBeInTheDocument();
    expect(screen.getByLabelText("Task type: Go Live")).toBeInTheDocument();
    expect(screen.getByLabelText("Task type: Decision")).toBeInTheDocument();
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
    showColumns("Progress");
    fireEvent.click(within(summaryRow).getByText("20%"));

    expect(screen.queryByDisplayValue("20")).not.toBeInTheDocument();
    expect(onUpdateSchedule).not.toHaveBeenCalled();
  });

  it("keeps the toolbar sticky and the planning workspace independently scrollable", () => {
    const onRegenerateWorkspace = vi.fn().mockResolvedValue(undefined);
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onRegenerateWorkspace={onRegenerateWorkspace}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const toolbar = screen.getByLabelText("Planning toolbar");
    expect(toolbar).toHaveClass("sticky");
    expect(toolbar).toHaveClass("z-40");
    const scrollableWorkspace = screen.getByLabelText(
      "Scrollable planning workspace",
    );
    expect(scrollableWorkspace).toHaveClass("overflow-y-auto");
    expect(screen.getByLabelText("Scrollable timeline pane")).toHaveClass(
      "overflow-x-auto",
    );

    const addButton = within(toolbar).getByRole("button", { name: "Add" });
    expect(addButton).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(addButton);
    expect(
      within(toolbar).getByRole("menuitem", { name: "Task" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).queryByRole("button", { name: /Add Child/ }),
    ).not.toBeInTheDocument();
    expect(
      within(toolbar).getByRole("menuitem", { name: "Summary" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("menuitem", { name: "Release" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Dependencies" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(toolbar).getByRole("button", { name: "Regenerate Snapshot" }),
    );
    expect(onRegenerateWorkspace).toHaveBeenCalled();
    expect(
      within(toolbar).getByRole("button", { name: "Fit to Project" }),
    ).toBeInTheDocument();
    expect(within(toolbar).getByLabelText("Time Scale")).toBeInTheDocument();
  });

  it("shows create snapshot when the planning workspace has no snapshot", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={
          {
            ...workspace,
            snapshot: null,
          } as unknown as ApiPlanningWorkspace
        }
      />,
    );

    expect(
      within(screen.getByLabelText("Planning toolbar")).getByRole("button", {
        name: "Create Snapshot",
      }),
    ).toBeInTheDocument();
  });

  it("keeps horizontal overflow owned by the timeline pane when the timeline exceeds the viewport", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={longTimelineWorkspace}
      />,
    );

    const scrollableWorkspace = screen.getByLabelText(
      "Scrollable planning workspace",
    );
    const timelinePane = screen.getByLabelText(
      "Scrollable timeline pane",
    ) as HTMLElement;
    const timelineSurface = screen.getByTestId("timeline-scroll-surface");
    const svg = screen.getByLabelText("Interactive Gantt timeline");
    Object.defineProperty(timelinePane, "clientWidth", {
      configurable: true,
      value: 640,
    });

    expect(scrollableWorkspace).toHaveClass("overflow-x-hidden");
    expect(timelinePane).toHaveClass("overflow-x-auto");
    expect(Number(svg.getAttribute("width"))).toBeGreaterThan(
      timelinePane.clientWidth,
    );
    expect(timelineSurface).toHaveStyle({
      width: `${svg.getAttribute("width")}px`,
    });
  });

  it("renders the default enterprise split layout with only core planning columns", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const splitWorkspace = screen.getByLabelText("Planning split workspace");
    expect(splitWorkspace).toHaveAttribute("data-view-mode", "split");
    expect(splitWorkspace).toHaveAttribute("data-grid-width", "560");
    expect(screen.getByLabelText("Frozen planning grid")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Scrollable timeline pane"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("separator", { name: "Resize planning panes" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("WBS").length).toBeGreaterThan(0);
    expect(screen.getByText("Task Name")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Finish")).toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
  });

  it("shows owners in the default WBS grid for executable work", () => {
    const ownerWorkspace: ApiPlanningWorkspace = {
      ...workspace,
      schedules: [
        {
          ...workspace.schedules[0],
          task: undefined,
        },
        {
          ...workspace.schedules[1],
          parentTaskId: null,
          task: {
            ...workspace.schedules[1].task,
            assignee: {
              email: "pm@example.com",
              firstName: "Priya",
              id: "user-pm",
              lastName: "Mohan",
              status: "active",
            },
            id: "task-parent",
            title: "Implement Customer SSO",
          },
          taskId: "task-parent",
          taskTitle: "Implement Customer SSO",
        },
        {
          ...workspace.schedules[1],
          id: "schedule-subtask-a",
          parentTaskId: "task-parent",
          sequenceNumber: 1,
          task: {
            ...workspace.schedules[1].task,
            assignee: {
              email: "engineer-a@example.com",
              firstName: "Engineer",
              id: "user-engineer-a",
              lastName: "A",
              status: "active",
            },
            id: "task-subtask-a",
            title: "Configure Azure AD",
          },
          taskId: "task-subtask-a",
          taskTitle: "Configure Azure AD",
        },
        {
          ...workspace.schedules[1],
          id: "schedule-subtask-b",
          parentTaskId: "task-parent",
          sequenceNumber: 2,
          task: {
            ...workspace.schedules[1].task,
            assignee: undefined,
            id: "task-subtask-b",
            title: "Configure SAML",
          },
          taskId: "task-subtask-b",
          taskTitle: "Configure SAML",
        },
        workspace.schedules[2],
      ],
    };

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={ownerWorkspace}
      />,
    );

    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Priya Mohan")).toBeInTheDocument();
    expect(screen.getByText("Engineer A")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("uses a compact grouped command surface and a wider task-name column", () => {
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
    expect(toolbar).toHaveClass("px-3", "py-2");
    expect(
      within(toolbar).getByRole("group", { name: "Create commands" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("group", { name: "Structure commands" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("group", { name: "Schedule commands" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("group", { name: "Time commands" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("group", { name: "View commands" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).queryByRole("button", { name: "Move Up" }),
    ).not.toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Zoom In" }),
    ).toHaveClass("h-8");

    expect(screen.getByRole("row", { name: /1 Planning/ })).toHaveStyle({
      gridTemplateColumns: "64px 300px 120px 96px 96px",
    });
  });

  it("expands long task-name rows and keeps timeline boundaries synchronized", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={longTaskNameWorkspace}
      />,
    );

    const longSummaryRow = screen.getByRole("row", {
      name: /1 Change pipelines to read from GraphQL/,
    });
    const longTaskRow = screen.getByRole("row", {
      name: /1\.1 Review PFM data/,
    });
    const longSubtaskRow = screen.getByRole("row", {
      name: /1\.1\.1 End points are empty/,
    });
    const shortTaskRow = screen.getByRole("row", { name: /2 Short task/ });

    expect(longSummaryRow).toHaveStyle({ height: "96px" });
    expect(longTaskRow).toHaveStyle({ height: "96px" });
    expect(longSubtaskRow).toHaveStyle({ height: "96px" });
    expect(shortTaskRow).toHaveStyle({ height: "42px" });
    expect(
      within(longTaskRow).getByRole("button", { name: "+ Add sub-task" }),
    ).toBeInTheDocument();
    expect(screen.getByText(longTaskName)).toHaveStyle({
      WebkitLineClamp: "4",
    });
    expect(
      screen.getByTestId("timeline-row-boundary-long-summary"),
    ).toHaveAttribute("y1", "140");
    expect(
      screen.getByTestId("timeline-row-boundary-long-task"),
    ).toHaveAttribute("y1", "236");
    expect(
      screen.getByTestId("timeline-row-boundary-long-subtask"),
    ).toHaveAttribute("y1", "332");
    expect(
      screen.getByTestId("timeline-row-boundary-short-task"),
    ).toHaveAttribute("y1", "374");
  });

  it("shows contextual task details without replacing the planning canvas", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const detailPanel = screen.getByLabelText("Planning detail panel");
    expect(
      within(detailPanel).getByText(
        "Select a grid row or Gantt object to inspect its planning details.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("row", { name: /1\.1 Design schedule/ }));

    expect(
      within(detailPanel).getByText("Design schedule"),
    ).toBeInTheDocument();
    expect(within(detailPanel).getByText("1.1 · Task")).toBeInTheDocument();
    expect(within(detailPanel).getByText("Critical path")).toBeInTheDocument();
    expect(detailPanel).toHaveClass("2xl:w-72", "2xl:border-l", "border-t");
    expect(screen.getByLabelText("Frozen planning grid")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Scrollable timeline pane"),
    ).toBeInTheDocument();
  });

  it("supports keyboard-first sibling task creation outside edit mode", async () => {
    const createdSchedule = {
      ...workspace.schedules[1],
      id: "schedule-keyboard",
      taskId: "task-keyboard",
      taskTitle: "New task",
    };
    const onCreateTask = vi.fn().mockResolvedValue(createdSchedule);

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={onCreateTask}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const row = screen.getByRole("row", { name: /1\.1 Design schedule/ });
    fireEvent.click(row);
    fireEvent.keyDown(row, { ctrlKey: true, key: "Enter" });

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        parentTaskId: "task-1",
        taskType: "task",
      });
    });
  });

  it("resizes the split panes with the draggable divider and persists the width", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize planning panes",
    });
    fireEvent(
      separator,
      new MouseEvent("pointerdown", { bubbles: true, clientX: 360 }),
    );
    fireEvent(
      separator,
      new MouseEvent("pointermove", {
        bubbles: true,
        buttons: 1,
        clientX: 480,
      }),
    );

    expect(screen.getByLabelText("Planning split workspace")).toHaveAttribute(
      "data-grid-width",
      "480",
    );
    expect(
      window.localStorage.getItem("pm-platform.planningWorkspace.splitWidth"),
    ).toBe("480");

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(screen.getByLabelText("Planning split workspace")).toHaveAttribute(
      "data-grid-width",
      "456",
    );
  });

  it("shows optional grid columns without shrinking the timeline pane", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    showColumns("Status", "Priority", "Progress", "Duration");

    const splitWorkspace = screen.getByLabelText("Planning split workspace");
    expect(splitWorkspace).toHaveAttribute("data-grid-width", "560");
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByLabelText("Scrollable timeline pane")).toHaveClass(
      "flex-1",
    );
  });

  it("persists split width, visible columns and zoom in local storage", () => {
    const { unmount } = render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize planning panes",
    });
    fireEvent(
      separator,
      new MouseEvent("pointerdown", { bubbles: true, clientX: 360 }),
    );
    fireEvent(
      separator,
      new MouseEvent("pointermove", {
        bubbles: true,
        buttons: 1,
        clientX: 500,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Zoom In" }));
    unmount();

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    expect(screen.getByLabelText("Planning split workspace")).toHaveAttribute(
      "data-grid-width",
      "500",
    );
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Time Scale")).toHaveValue("day");
  });

  it("supports grid-only and timeline-only view modes", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^View/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Grid Only/ }));

    expect(screen.getByLabelText("Frozen planning grid")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Scrollable timeline pane"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("separator", { name: "Resize planning panes" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^View/ }));
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: /Timeline Only/ }),
    );

    expect(
      screen.queryByLabelText("Frozen planning grid"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Scrollable timeline pane"),
    ).toBeInTheDocument();
  });

  it("shows float columns from the View menu and keeps summary schedule values blank", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    expect(screen.queryByText("ES")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^View/ }));
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Show Float Columns/ }),
    );

    expect(screen.getByText("ES")).toBeInTheDocument();
    expect(screen.getByText("EF")).toBeInTheDocument();
    expect(screen.getByText("LS")).toBeInTheDocument();
    expect(screen.getByText("LF")).toBeInTheDocument();
    expect(screen.getByText("Total Float")).toBeInTheDocument();
    expect(screen.getByText("Free Float")).toBeInTheDocument();
    expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Planning ES blank")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Planning Total Float blank"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Design schedule Total Float 0d"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Design schedule Critical yes"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Gate approved ES 5")).toBeInTheDocument();
    expect(
      window.localStorage.getItem(
        "pm-platform.planningWorkspace.showFloatColumns",
      ),
    ).toBe("true");
  });

  it("supports individual float columns from the Columns menu", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    showColumns("Total Float", "Free Float", "Critical");

    expect(screen.getByText("Total Float")).toBeInTheDocument();
    expect(screen.getByText("Free Float")).toBeInTheDocument();
    expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Design schedule Free Float 0d"),
    ).toBeInTheDocument();
  });

  it("filters Gantt bars when Show Critical Path is enabled", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    expect(screen.getByLabelText("Move Planning")).toBeInTheDocument();
    expect(screen.getByLabelText("Move Design schedule")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Milestone Gate approved"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^View/ }));
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Show Critical Path/ }),
    );

    expect(screen.getByLabelText("Move Planning")).toBeInTheDocument();
    expect(screen.getByLabelText("Move Design schedule")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Milestone Gate approved"),
    ).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(
        "pm-platform.planningWorkspace.showCriticalPath",
      ),
    ).toBe("true");
  });

  it("uses default columns on laptop-sized viewports even when optional columns are saved", () => {
    window.localStorage.setItem(
      "pm-platform.planningWorkspace.visibleColumns",
      "ownerId,status,priority,percentComplete",
    );
    setViewportWidth(1024);

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    expect(screen.getByText("Task Name")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /columns/i }));
    expect(screen.getByLabelText("Status")).toBeDisabled();
  });

  it("creates a contextual sub-task draft only from eligible task rows", async () => {
    const onCreateTask = vi.fn().mockResolvedValue({
      ...workspace.schedules[1],
      id: "schedule-subtask",
      parentTaskId: "task-2",
      taskId: "task-subtask",
      taskTitle: "New sub-task",
    });
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={onCreateTask}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        projectMembers={projectMembers}
        workspace={workspace}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Add Child/ }),
    ).not.toBeInTheDocument();

    expect(
      within(screen.getByRole("row", { name: /1 Planning/ })).queryByRole(
        "button",
        { name: "+ Add sub-task" },
      ),
    ).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("row", { name: /1\.2 Gate approved/ }),
      ).queryByRole("button", { name: "+ Add sub-task" }),
    ).not.toBeInTheDocument();

    const taskRow = screen.getByRole("row", { name: /1\.1 Design schedule/ });
    fireEvent.click(
      within(taskRow).getByRole("button", { name: "+ Add sub-task" }),
    );
    expect(
      screen.getByRole("row", { name: /Draft planning row 1\.1\.1 Sub-task/ }),
    ).toBeInTheDocument();
    expect(within(getDraftPlanningRow()).getByRole("textbox")).toHaveValue(
      "New Sub-task",
    );
    expect(
      within(getDraftPlanningRow()).getByRole("option", { name: "Bob Stone" }),
    ).toBeInTheDocument();
    submitDraftCreateRow({ ownerId: "user-2" });
    await waitFor(() =>
      expect(onCreateTask).toHaveBeenCalledWith({
        ownerId: "user-2",
        parentTaskId: "task-2",
        taskType: "task",
        title: "New Sub-task",
      }),
    );
    expect(
      screen.getByRole("row", { name: /1\.1 Design schedule/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("creates an inline task draft beneath the selected summary", async () => {
    const onCreateTask = vi
      .fn()
      .mockResolvedValue({
        durationDays: 1,
        id: "schedule-child-1",
        isCritical: false,
        parentTaskId: "task-1",
        percentComplete: 0,
        plannedFinishDate: null,
        plannedStartDate: null,
        projectId: "project-1",
        sequenceNumber: 3,
        snapshotId: "snapshot-1",
        taskId: "child-1",
        taskKind: "standard",
        taskTitle: "New child task",
      });

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={onCreateTask}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    const summaryRow = screen.getByRole("row", { name: /1 Planning/ });
    fireEvent.click(summaryRow);
    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Task" }));
    expect(
      screen.getByRole("row", { name: /Draft planning row 1\.3 Task/ }),
    ).toBeInTheDocument();
    submitDraftCreateRow();

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        ownerId: null,
        parentTaskId: "task-1",
        taskType: "task",
        title: "New Task",
      });
    });
    expect(screen.getByRole("row", { name: /1 Planning/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("preserves selected summary when expanding and collapsing children", () => {
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
    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    expect(screen.getByRole("row", { name: /1 Planning/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /expand planning/i }));
    expect(screen.getByRole("row", { name: /1 Planning/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
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

    const milestoneRow = screen.getByRole("row", {
      name: /1\.2 Gate approved/,
    });
    showColumns("Status", "Progress");
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

    expect(
      screen.getByRole("row", { name: /1\.1\.1 Backend/ }),
    ).toBeInTheDocument();

    runStructureCommand("Collapse All");

    expect(screen.getByRole("row", { name: /1 Phase 1/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Phase 2/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /Development/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Visible Tasks: 2")).toBeInTheDocument();

    runStructureCommand("Expand All");

    expect(
      screen.getByRole("row", { name: /1\.1\.1 Backend/ }),
    ).toBeInTheDocument();
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

    fireEvent.click(screen.getByTitle("Alice Ng"));
    const ownerSelect = screen
      .getByRole("option", { name: "Bob Stone" })
      .closest("select");
    expect(ownerSelect).not.toBeNull();
    expect(
      screen.getByRole("option", { name: "Bob Stone" }),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("row", { name: /1\.1 Development/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /1\.1\.1 Backend/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /1\.2 Testing/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /collapse development/i }),
    ).toHaveTextContent("▾");
    expect(
      screen.getByRole("button", { name: /collapse phase 1/i }),
    ).toHaveTextContent("▾");

    fireEvent.click(
      screen.getByRole("button", { name: /collapse development/i }),
    );
    expect(
      screen.queryByRole("row", { name: /1\.1\.1 Backend/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /1\.2 Testing/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand development/i }),
    ).toHaveTextContent("▸");

    fireEvent.click(screen.getByRole("button", { name: /collapse phase 1/i }));
    expect(
      screen.queryByRole("row", { name: /1\.1 Development/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /1\.2 Testing/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Phase 2/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand phase 1/i }),
    ).toHaveTextContent("▸");

    fireEvent.click(screen.getByRole("button", { name: /expand phase 1/i }));
    expect(
      screen.getByRole("row", { name: /1\.1 Development/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /1\.1\.1 Backend/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /expand development/i }),
    );
    expect(
      screen.getByRole("row", { name: /1\.1\.1 Backend/ }),
    ).toBeInTheDocument();
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
      within(leafRow).queryByRole("button", {
        name: /collapse design schedule/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(leafRow).queryByRole("button", {
        name: /expand design schedule/i,
      }),
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
    expect(
      screen.queryByRole("row", { name: /1\.1 Design schedule/ }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(summaryRow, { key: "ArrowRight" });
    expect(
      screen.getByRole("row", { name: /1\.1 Design schedule/ }),
    ).toBeInTheDocument();
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

  it("creates a sibling task with a selected owner from the inline draft", async () => {
    const newSchedule = {
      ...workspace.schedules[1],
      id: "schedule-4",
      parentTaskId: "task-1",
      sequenceNumber: 3,
      task: {
        ...workspace.schedules[1].task,
        assignee: {
          email: "bob@example.com",
          firstName: "Bob",
          id: "user-2",
          lastName: "Stone",
          status: "active",
        },
        id: "task-4",
        title: "API handoff",
      },
      taskId: "task-4",
      taskTitle: "API handoff",
    };
    const onCreateTask = vi.fn().mockResolvedValue(newSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] = React.useState(workspace);
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
          projectMembers={projectMembers}
          workspace={currentWorkspace}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByText("Design schedule"));
    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Task" }));
    expect(
      screen.getByRole("row", { name: /Draft planning row 1\.3 Task/ }),
    ).toBeInTheDocument();
    expect(within(getDraftPlanningRow()).getByRole("textbox")).toHaveValue(
      "New Task",
    );
    expect(
      within(getDraftPlanningRow()).getByRole("option", { name: "Bob Stone" }),
    ).toBeInTheDocument();
    submitDraftCreateRow({ ownerId: "user-2", title: "API handoff" });

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        ownerId: "user-2",
        parentTaskId: "task-1",
        taskType: "task",
        title: "API handoff",
      });
    });
    expect((await screen.findAllByText("Bob Stone")).length).toBeGreaterThan(0);
  });

  it("creates a sibling summary and immediately opens the title editor", async () => {
    const newSchedule = {
      ...workspace.schedules[0],
      id: "schedule-summary-2",
      parentTaskId: "task-1",
      plannedFinishDate: null,
      plannedStartDate: null,
      sequenceNumber: 3,
      task: {
        ...workspace.schedules[0].task,
        id: "task-summary-2",
        title: "New Summary",
      },
      taskId: "task-summary-2",
      taskKind: "summary" as const,
      taskTitle: "New Summary",
    };
    const onCreateTask = vi.fn().mockResolvedValue(newSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] = React.useState(workspace);
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Summary" }));

    expect(onCreateTask).toHaveBeenCalledWith({
      parentTaskId: "task-1",
      taskType: "summary",
    });
    expect(await screen.findByDisplayValue("New Summary")).toHaveFocus();
    await waitFor(() => {
      const persistedState = JSON.parse(
        window.localStorage.getItem(
          "pm-platform.planningWorkspace.collapsedSummaryIds.project-1",
        ) ?? "[]",
      ) as string[];
      expect(persistedState).toContain("task-summary-2");
    });
  });

  it("creates a sibling milestone and immediately opens the title editor", async () => {
    const newSchedule = {
      ...workspace.schedules[2],
      id: "schedule-milestone-2",
      milestoneCategory: "release" as const,
      parentTaskId: "task-1",
      plannedFinishDate: "2026-07-08",
      plannedStartDate: "2026-07-08",
      sequenceNumber: 3,
      task: {
        ...workspace.schedules[2].task,
        id: "task-milestone-2",
        milestoneCategory: "release" as const,
        title: "New Milestone",
      },
      taskId: "task-milestone-2",
      taskKind: "milestone" as const,
      taskTitle: "New Milestone",
    };
    const onCreateTask = vi.fn().mockResolvedValue(newSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] = React.useState(workspace);
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Release" }));

    expect(onCreateTask).toHaveBeenCalledWith({
      milestoneCategory: "release",
      parentTaskId: "task-1",
      taskType: "milestone",
    });
    expect(await screen.findByDisplayValue("New Milestone")).toHaveFocus();
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
      const [currentWorkspace, setCurrentWorkspace] = React.useState(workspace);
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

    fireEvent.click(screen.getByTitle("Design schedule"));
    fireEvent.change(screen.getByDisplayValue("Design schedule"), {
      target: { value: "Build delivery plan" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("Build delivery plan"), {
      key: "Enter",
    });

    expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
      taskTitle: "Build delivery plan",
    });
    expect(await screen.findAllByText("Build delivery plan")).toHaveLength(2);
  });

  it("renames a summary from the Name field", async () => {
    const updatedSchedule = {
      ...wbsEditingWorkspace.schedules[0],
      taskTitle: "Program Planning",
    };
    const onUpdateSchedule = vi.fn().mockResolvedValue(updatedSchedule);

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={wbsEditingWorkspace}
      />,
    );

    fireEvent.click(screen.getByTitle("Planning"));
    const editor = screen.getByDisplayValue("Planning");
    expect(editor).toHaveClass("w-full");
    expect(editor.parentElement?.parentElement).toHaveClass("flex-1");
    fireEvent.change(editor, {
      target: { value: "Program Planning" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("Program Planning"), {
      key: "Enter",
    });

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("summary-1", {
        taskTitle: "Program Planning",
      });
    });
  });

  it("renames a milestone from the Name field", async () => {
    const updatedSchedule = {
      ...workspace.schedules[2],
      taskTitle: "Release approved",
    };
    const onUpdateSchedule = vi.fn().mockResolvedValue(updatedSchedule);

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByTitle("Gate approved"));
    fireEvent.change(screen.getByDisplayValue("Gate approved"), {
      target: { value: "Release approved" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("Release approved"), {
      key: "Enter",
    });

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("task-3", {
        taskTitle: "Release approved",
      });
    });
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

    showColumns("Progress");
    fireEvent.click(screen.getByText("50%"));
    fireEvent.change(screen.getByDisplayValue("50"), {
      target: { value: "125" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("125"), { key: "Enter" });

    expect(
      screen.getByText("Progress must be between 0 and 100."),
    ).toBeInTheDocument();
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
    fireEvent.click(within(milestoneRow).getByText("07-06"));
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

  it("activates date, status and progress editors from a single click", async () => {
    const onUpdateSchedule = vi.fn().mockResolvedValue(workspace.schedules[1]);
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={workspace}
      />,
    );

    showColumns("Status", "Progress");
    const taskRow = screen.getByRole("row", { name: /1\.1 Design schedule/ });

    fireEvent.click(within(taskRow).getByText("07-05"));
    fireEvent.change(screen.getByDisplayValue("2026-07-05"), {
      target: { value: "2026-07-07" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("2026-07-07"), {
      key: "Enter",
    });

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
        plannedFinishDate: "2026-07-07",
      });
    });

    fireEvent.click(within(taskRow).getByText("In Progress"));
    const statusSelect = screen
      .getByRole("option", { name: "Done" })
      .closest("select");
    expect(statusSelect).not.toBeNull();
    fireEvent.change(statusSelect as HTMLSelectElement, {
      target: { value: "done" },
    });

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
        status: "done",
      });
    });

    fireEvent.click(within(taskRow).getByText("50%"));
    fireEvent.change(screen.getByDisplayValue("50"), {
      target: { value: "75" },
    });
    fireEvent.keyDown(screen.getByDisplayValue("75"), {
      key: "Enter",
    });

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
        percentComplete: 75,
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

    fireEvent.change(screen.getByRole("combobox", { name: "Type" }), {
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

  it("zooms in and increases the rendered timeline width while preserving the timeline viewport", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={longTimelineWorkspace}
      />,
    );

    const timelinePane = screen.getByLabelText(
      "Scrollable timeline pane",
    ) as HTMLElement;
    Object.defineProperty(timelinePane, "clientWidth", {
      configurable: true,
      value: 640,
    });
    timelinePane.scrollLeft = 220;
    const beforeWidth = Number(
      screen.getByLabelText("Interactive Gantt timeline").getAttribute("width"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom In" }));

    const afterWidth = Number(
      screen.getByLabelText("Interactive Gantt timeline").getAttribute("width"),
    );
    expect(afterWidth).toBeGreaterThan(beforeWidth);
    expect(timelinePane.scrollLeft).toBeGreaterThan(220);
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

  it("zooms out and reduces the rendered timeline width", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={longTimelineWorkspace}
      />,
    );

    const beforeWidth = Number(
      screen.getByLabelText("Interactive Gantt timeline").getAttribute("width"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom Out" }));

    const afterWidth = Number(
      screen.getByLabelText("Interactive Gantt timeline").getAttribute("width"),
    );
    expect(afterWidth).toBeLessThan(beforeWidth);
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

  it("fits a long project into the visible timeline pane and resets horizontal scroll", async () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={longTimelineWorkspace}
      />,
    );

    const timelinePane = screen.getByLabelText(
      "Scrollable timeline pane",
    ) as HTMLElement;
    Object.defineProperty(timelinePane, "clientWidth", {
      configurable: true,
      value: 640,
    });
    timelinePane.scrollLeft = 400;

    fireEvent.click(screen.getByRole("button", { name: "Fit to Project" }));

    await waitFor(() => expect(timelinePane.scrollLeft).toBe(0));
    expect(screen.getByLabelText("Time Scale")).toHaveValue("quarter");
    expect(
      Number(
        screen
          .getByLabelText("Interactive Gantt timeline")
          .getAttribute("width"),
      ),
    ).toBe(640);
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
    );
    const timelinePane = screen.getByLabelText(
      "Scrollable timeline pane",
    ) as HTMLElement;
    Object.defineProperty(timelinePane, "clientWidth", {
      configurable: true,
      value: 20,
    });

    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(screen.getByLabelText("Today marker")).toBeInTheDocument();
    expect(timelinePane.scrollLeft).toBeGreaterThan(0);
    expect(scrollableWorkspace.scrollLeft).toBe(0);
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

  it("keeps the timeline header, bars and dependency lines on the same rendered width", () => {
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={longTimelineWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom In" }));

    const svg = screen.getByLabelText("Interactive Gantt timeline");
    const width = svg.getAttribute("width");
    const rowLine = svg.querySelector("line[y1='86']");
    const dependencyLine = svg.querySelector("path[marker-end='url(#arrow)']");

    expect(rowLine).toHaveAttribute("x2", width);
    expect(screen.getByLabelText("Move Discovery")).toBeInTheDocument();
    expect(dependencyLine).toBeInTheDocument();
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
    expect(
      screen.getByRole("row", { name: /Draft planning row 4 Task/ }),
    ).toBeInTheDocument();
    expect(within(getDraftPlanningRow()).getByRole("textbox")).toHaveFocus();
    submitDraftCreateRow();

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        ownerId: null,
        parentTaskId: null,
        taskType: "task",
        title: "New Task",
      });
    });
    expect(
      await screen.findByRole("row", { name: /4 New Task/ }),
    ).toBeInTheDocument();
  });

  it("cancels an inline task draft with Escape", () => {
    const onCreateTask = vi.fn();
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={onCreateTask}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={orderingWorkspace}
      />,
    );

    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Task" }));
    fireEvent.keyDown(within(getDraftPlanningRow()).getByRole("textbox"), {
      key: "Escape",
    });

    expect(
      screen.queryByRole("row", { name: /Draft planning row/ }),
    ).not.toBeInTheDocument();
    expect(onCreateTask).not.toHaveBeenCalled();
  });

  it("keeps an inline task draft local when the title is empty", () => {
    const onCreateTask = vi.fn();
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={onCreateTask}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={orderingWorkspace}
      />,
    );

    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Task" }));
    submitDraftCreateRow({ title: "" });

    expect(screen.getByText("Task name is required.")).toBeInTheDocument();
    expect(getDraftPlanningRow()).toBeInTheDocument();
    expect(onCreateTask).not.toHaveBeenCalled();
  });

  it("preserves an inline task draft when create fails", async () => {
    const onCreateTask = vi
      .fn()
      .mockRejectedValue(new Error("Unable to create task."));
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={onCreateTask}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={vi.fn()}
        workspace={orderingWorkspace}
      />,
    );

    openAddMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Task" }));
    submitDraftCreateRow({ title: "Blocked task" });

    await waitFor(() =>
      expect(screen.getAllByText("Unable to create task.").length).toBeGreaterThan(
        0,
      ),
    );
    expect(getDraftPlanningRow()).toBeInTheDocument();
    expect(within(getDraftPlanningRow()).getByRole("textbox")).toHaveValue(
      "Blocked task",
    );
  });

  it("expands a collapsed task parent when adding a sub-task draft", async () => {
    const collapsedTaskWorkspace: ApiPlanningWorkspace = {
      ...orderingWorkspace,
      schedules: [
        ...orderingWorkspace.schedules,
        {
          ...orderingWorkspace.schedules[1],
          id: "schedule-6",
          parentTaskId: "task-4",
          sequenceNumber: 1,
          task: {
            ...orderingWorkspace.schedules[1].task,
            id: "task-6",
            title: "Execution child",
          },
          taskId: "task-6",
          taskTitle: "Execution child",
        },
      ],
    };
    const newSchedule = {
      ...orderingWorkspace.schedules[1],
      id: "schedule-7",
      parentTaskId: "task-4",
      sequenceNumber: 2,
      task: {
        ...orderingWorkspace.schedules[1].task,
        id: "task-7",
        title: "New Sub-task",
      },
      taskId: "task-7",
      taskTitle: "New Sub-task",
    };
    const onCreateTask = vi.fn().mockResolvedValue(newSchedule);

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] =
        React.useState(collapsedTaskWorkspace);
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

    fireEvent.click(screen.getByRole("button", { name: /collapse execution/i }));
    expect(
      screen.queryByRole("row", { name: /2\.1 Execution child/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("row", { name: /2 Execution/ })).getByRole(
        "button",
        { name: "+ Add sub-task" },
      ),
    );
    expect(
      screen.getByRole("row", { name: /Draft planning row 2\.2 Sub-task/ }),
    ).toBeInTheDocument();
    expect(within(getDraftPlanningRow()).getByRole("textbox")).toHaveValue(
      "New Sub-task",
    );
    submitDraftCreateRow();

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        ownerId: null,
        parentTaskId: "task-4",
        taskType: "task",
        title: "New Sub-task",
      });
    });
    await waitFor(() => expect(onCreateTask).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("row", { name: /2\.1 Execution child/ }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("row", { name: /2\.1 Execution child/ }),
      ).queryByRole("button", { name: "+ Add sub-task" }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByRole("row", { name: /2\.1 Design schedule/ }),
    ).toBeInTheDocument();
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
        "Milestones are scheduling events and cannot contain child items.",
      ),
    ).toBeInTheDocument();
    expect(onUpdateSchedule).not.toHaveBeenCalled();
  });

  it("reparents a task when dropped onto another summary and refreshes WBS numbering", async () => {
    const onRefreshWorkspace = vi.fn().mockResolvedValue(undefined);
    const onUpdateSchedule = vi.fn().mockImplementation((taskId, input) =>
      Promise.resolve({
        ...wbsEditingWorkspace.schedules.find(
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
        onRefreshWorkspace={onRefreshWorkspace}
        onUpdateSchedule={onUpdateSchedule}
        workspace={wbsEditingWorkspace}
      />,
    );

    dragRow(/1\.1 Design schedule/, /2 Execution/);

    expect(
      screen.getByRole("row", { name: /2\.2 Design schedule/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(onUpdateSchedule).toHaveBeenCalledTimes(2));
    expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
      parentTaskId: "summary-2",
      sequenceNumber: 2,
    });
    expect(onUpdateSchedule).toHaveBeenCalledWith("task-3", {
      parentTaskId: "summary-1",
      sequenceNumber: 1,
    });
    expect(onRefreshWorkspace).toHaveBeenCalled();
  });

  it("rejects cross-summary row drops onto subtasks", async () => {
    const onUpdateSchedule = vi.fn();
    const workspaceWithSubtaskTarget: ApiPlanningWorkspace = {
      ...wbsEditingWorkspace,
      schedules: [
        ...wbsEditingWorkspace.schedules,
        {
          ...workspace.schedules[1],
          id: "task-build-api-tests",
          parentTaskId: "task-4",
          sequenceNumber: 1,
          task: {
            ...workspace.schedules[1].task,
            id: "task-5",
            title: "Build API tests",
          },
          taskId: "task-5",
          taskTitle: "Build API tests",
        },
      ],
    };
    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onUpdateSchedule={onUpdateSchedule}
        workspace={workspaceWithSubtaskTarget}
      />,
    );

    dragRow(/1\.1 Design schedule/, /2\.1\.1 Build API tests/);

    expect(
      screen.getByText("Sub-tasks cannot contain child items."),
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
    expect(
      screen.queryByRole("row", { name: /1\.1 Design schedule/ }),
    ).not.toBeInTheDocument();

    dragRow(/1 Planning/, /3 Closure/);

    expect(
      screen.getByRole("row", { name: /1 Execution/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Closure/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /3 Planning/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /3\.1 Design schedule/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand planning/i }));
    expect(
      screen.getByRole("row", { name: /3\.1 Design schedule/ }),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("row", { name: /3 Execution/ }),
    ).toBeInTheDocument();
  });

  it("deletes an empty summary immediately", async () => {
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const onRefreshWorkspace = vi.fn().mockResolvedValue(undefined);

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onDeleteTask={onDeleteTask}
        onRefreshWorkspace={onRefreshWorkspace}
        onUpdateSchedule={vi.fn()}
        workspace={wbsEditingWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("row", { name: /3 Empty Summary/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Delete selected task" }),
    );

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith("summary-3");
    });
    expect(
      screen.queryByText("This Summary contains child items."),
    ).not.toBeInTheDocument();
    expect(onRefreshWorkspace).toHaveBeenCalled();
  });

  it("deletes a summary with children after promoting them to the parent level", async () => {
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const onRefreshWorkspace = vi.fn().mockResolvedValue(undefined);
    const onUpdateSchedule = vi.fn().mockImplementation((taskId, input) =>
      Promise.resolve({
        ...wbsEditingWorkspace.schedules.find(
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
        onDeleteTask={onDeleteTask}
        onRefreshWorkspace={onRefreshWorkspace}
        onUpdateSchedule={onUpdateSchedule}
        workspace={wbsEditingWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("row", { name: /1 Planning/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Delete selected task" }),
    );

    expect(
      screen.getByText("This Summary contains child items."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Move children to parent" }),
    );

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith("summary-1");
    });
    expect(
      screen.getByRole("row", { name: /1 Design schedule/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /2 Gate approved/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /3 Execution/ }),
    ).toBeInTheDocument();
    expect(onRefreshWorkspace).toHaveBeenCalled();
  });

  it("moves a task to another summary from the toolbar action", async () => {
    const onRefreshWorkspace = vi.fn().mockResolvedValue(undefined);
    const onUpdateSchedule = vi.fn().mockImplementation((taskId, input) =>
      Promise.resolve({
        ...wbsEditingWorkspace.schedules.find(
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
        onRefreshWorkspace={onRefreshWorkspace}
        onUpdateSchedule={onUpdateSchedule}
        workspace={wbsEditingWorkspace}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /collapse execution/i }),
    );
    fireEvent.click(screen.getByRole("row", { name: /1\.1 Design schedule/ }));
    runStructureCommand("Move to Summary...");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("task-2", {
        parentTaskId: "summary-2",
        sequenceNumber: 2,
      });
    });
    expect(
      screen.getByRole("button", { name: /expand execution/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /2\.2 Design schedule/ }),
    ).not.toBeInTheDocument();
    expect(onRefreshWorkspace).toHaveBeenCalled();
  });

  it("moves a summary up and refreshes WBS numbering", async () => {
    const onRefreshWorkspace = vi.fn().mockResolvedValue(undefined);
    const onUpdateSchedule = vi.fn().mockImplementation((taskId, input) =>
      Promise.resolve({
        ...wbsEditingWorkspace.schedules.find(
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
        onRefreshWorkspace={onRefreshWorkspace}
        onUpdateSchedule={onUpdateSchedule}
        workspace={wbsEditingWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /collapse execution/i }),
    );
    fireEvent.click(screen.getByRole("row", { name: /2 Execution/ }));
    runStructureCommand("Move Up");

    expect(
      screen.getByRole("row", { name: /1 Execution/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /2 Planning/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand execution/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand planning/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /Build API/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /Design schedule/ }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(onUpdateSchedule).toHaveBeenCalledWith("summary-2", {
        parentTaskId: null,
        sequenceNumber: 1,
      });
    });
  });

  it("surfaces invalid move errors and restores the previous hierarchy", async () => {
    const onUpdateSchedule = vi
      .fn()
      .mockRejectedValue(new Error("Task hierarchy cannot contain cycles"));

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onRefreshWorkspace={vi.fn().mockResolvedValue(undefined)}
        onUpdateSchedule={onUpdateSchedule}
        workspace={wbsEditingWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("row", { name: /1\.1 Design schedule/ }));
    runStructureCommand("Move to Summary...");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    expect(
      await screen.findByText("Task hierarchy cannot contain cycles"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /1\.1 Design schedule/ }),
    ).toBeInTheDocument();
  });

  it("refreshes summary rollups after a hierarchy move reloads the workspace", async () => {
    const refreshedWorkspace: ApiPlanningWorkspace = {
      ...wbsEditingWorkspace,
      schedules: [
        {
          ...wbsEditingWorkspace.schedules[0],
          plannedFinishDate: "2026-07-06",
          plannedStartDate: "2026-07-06",
          taskTitle: "Planning",
        },
        {
          ...wbsEditingWorkspace.schedules[1],
          parentTaskId: "summary-2",
          sequenceNumber: 2,
        },
        wbsEditingWorkspace.schedules[2],
        {
          ...wbsEditingWorkspace.schedules[3],
          plannedFinishDate: "2026-07-20",
          plannedStartDate: "2026-07-01",
        },
        wbsEditingWorkspace.schedules[4],
        wbsEditingWorkspace.schedules[5],
      ],
    };

    function Harness() {
      const [currentWorkspace, setCurrentWorkspace] =
        React.useState(wbsEditingWorkspace);
      return (
        <PlanningWorkspace
          onCreateDependency={vi.fn()}
          onCreateTask={vi.fn()}
          onDeleteDependency={vi.fn()}
          onRefreshWorkspace={async () =>
            setCurrentWorkspace(refreshedWorkspace)
          }
          onUpdateSchedule={async (taskId, input) =>
            ({
              ...currentWorkspace.schedules.find(
                (schedule) => schedule.taskId === taskId,
              ),
              ...input,
            }) as ApiPlanningWorkspace["schedules"][number]
          }
          workspace={currentWorkspace}
        />
      );
    }

    render(<Harness />);

    dragRow(/1\.1 Design schedule/, /2 Execution/);

    await waitFor(() => {
      expect(screen.getByRole("row", { name: /1 Planning/ })).toHaveTextContent(
        "07-06",
      );
    });
    expect(screen.getByRole("row", { name: /2 Execution/ })).toHaveTextContent(
      "07-20",
    );
  });

  it("restores expansion state when the planning workspace remounts", async () => {
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
    expect(
      screen.queryByRole("row", { name: /1\.1 Design schedule/ }),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(
        window.localStorage.getItem(
          "pm-platform.planningWorkspace.collapsedSummaryIds.project-1",
        ),
      ).not.toBeNull(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remount planning" }));
    expect(
      screen.queryByRole("row", { name: /1\.1 Design schedule/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand planning/i }),
    ).toBeInTheDocument();
  });

  it("preserves expansion state across refresh and auto-save schedule updates", () => {
    const props = {
      onCreateDependency: vi.fn(),
      onCreateTask: vi.fn(),
      onDeleteDependency: vi.fn(),
      onUpdateSchedule: vi.fn(),
    };
    const { rerender } = render(
      <PlanningWorkspace {...props} workspace={workspace} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    expect(
      screen.queryByRole("row", { name: /1\.1 Design schedule/ }),
    ).not.toBeInTheDocument();

    rerender(
      <PlanningWorkspace
        {...props}
        isSaving
        workspace={{
          ...workspace,
          schedules: workspace.schedules.map((schedule) => ({
            ...schedule,
            percentComplete: Number(schedule.percentComplete ?? 0) + 1,
          })),
        }}
      />,
    );
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand planning/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /Design schedule/ }),
    ).not.toBeInTheDocument();

    rerender(<PlanningWorkspace {...props} workspace={{ ...workspace }} />);
    expect(
      screen.getByRole("button", { name: /expand planning/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /Design schedule/ }),
    ).not.toBeInTheDocument();
  });

  it("duplicates a Summary Task from its context menu and supports undo and redo", async () => {
    const duplicatedWorkspace: ApiPlanningWorkspace = {
      ...workspace,
      schedules: [
        ...workspace.schedules,
        {
          ...workspace.schedules[0],
          id: "schedule-copy",
          sequenceNumber: 2,
          taskId: "summary-copy",
          taskTitle: "Planning Wave 2",
        },
        {
          ...workspace.schedules[1],
          id: "schedule-child-copy",
          parentTaskId: "summary-copy",
          sequenceNumber: 1,
          taskId: "task-copy",
          taskTitle: "Design schedule",
        },
      ],
    };
    const onDuplicateWorkPackage = vi
      .fn()
      .mockResolvedValueOnce({
        copiedTaskIds: ["summary-copy", "task-copy"],
        newSummaryTaskId: "summary-copy",
        workspace: duplicatedWorkspace,
      })
      .mockResolvedValueOnce({
        copiedTaskIds: ["summary-copy-2", "task-copy-2"],
        newSummaryTaskId: "summary-copy-2",
        workspace: {
          ...duplicatedWorkspace,
          schedules: duplicatedWorkspace.schedules.map((schedule) =>
            schedule.taskId === "summary-copy"
              ? { ...schedule, id: "schedule-copy-2", taskId: "summary-copy-2" }
              : schedule.taskId === "task-copy"
                ? {
                    ...schedule,
                    id: "schedule-child-copy-2",
                    parentTaskId: "summary-copy-2",
                    taskId: "task-copy-2",
                  }
                : schedule,
          ),
        },
      });
    const onRemoveDuplicatedWorkPackage = vi.fn().mockResolvedValue(workspace);

    render(
      <PlanningWorkspace
        onCreateDependency={vi.fn()}
        onCreateTask={vi.fn()}
        onDeleteDependency={vi.fn()}
        onDuplicateWorkPackage={onDuplicateWorkPackage}
        onRemoveDuplicatedWorkPackage={onRemoveDuplicatedWorkPackage}
        onUpdateSchedule={vi.fn()}
        workspace={workspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    expect(
      screen.queryByRole("row", { name: /1\.1 Design schedule/ }),
    ).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole("row", { name: /1 Planning/ }), {
      clientX: 120,
      clientY: 160,
    });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole("row", { name: /1 Planning/ }), {
      clientX: 120,
      clientY: 160,
    });
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Duplicate Work Package/ }),
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Duplicate Work Package" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Copy child tasks/)).toBeChecked();
    expect(screen.getByLabelText(/Copy planned dates/)).not.toBeChecked();
    fireEvent.change(screen.getByLabelText(/New Summary Name/), {
      target: { value: "Planning Wave 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    await waitFor(() =>
      expect(onDuplicateWorkPackage).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({
          copyChildTasks: true,
          copyPlannedDates: false,
          newSummaryName: "Planning Wave 2",
          preserveInternalPredecessors: true,
        }),
      ),
    );
    expect(
      await screen.findByRole("row", { name: /Planning Wave 2/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("button", { name: /expand planning wave 2/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /Design schedule/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand planning$/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /expand planning wave 2/i }),
    );
    expect(
      screen.getByRole("button", { name: /collapse planning wave 2/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /Design schedule/ }),
    ).toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByLabelText("Planning split workspace").parentElement!,
      { ctrlKey: true, key: "z" },
    );
    await waitFor(() =>
      expect(onRemoveDuplicatedWorkPackage).toHaveBeenCalledWith(
        "summary-copy",
      ),
    );
    expect(
      screen.getByRole("button", { name: /expand planning$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /1 Planning/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("row", { name: /Design schedule/ }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByLabelText("Planning split workspace").parentElement!,
      { ctrlKey: true, key: "Z", shiftKey: true },
    );
    await waitFor(() =>
      expect(onDuplicateWorkPackage).toHaveBeenCalledTimes(2),
    );
    expect(
      await screen.findByRole("button", {
        name: /collapse planning wave 2/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /Planning Wave 2/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("row", { name: /Design schedule/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand planning$/i }),
    ).toBeInTheDocument();
  });
});
