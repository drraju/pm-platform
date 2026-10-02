import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodayWorkspace } from "@/components/today/today-workspace";
import type { ApiProjectDetails, ApiTask } from "@/features/projects";

const members = [
  {
    id: "member-1",
    role: "manager",
    user: {
      email: "ava@example.com",
      firstName: "Ava",
      id: "user-1",
      lastName: "Patel",
      status: "active" as const,
    },
    userId: "user-1",
  },
  {
    id: "member-2",
    role: "contributor",
    user: {
      email: "ben@example.com",
      firstName: "Ben",
      id: "user-2",
      lastName: "Ng",
      status: "active" as const,
    },
    userId: "user-2",
  },
];

function createProject(tasks: ApiTask[]): ApiProjectDetails {
  return {
    id: "project-1",
    members,
    name: "Delivery Program",
    status: "active",
    tasks,
  };
}

function renderToday(
  project: ApiProjectDetails,
  options: {
    currentUserId?: string | null;
    onLoadHistory?: ReturnType<typeof vi.fn>;
    onRefreshTasks?: ReturnType<typeof vi.fn>;
    roleNames?: string[];
    identityType?: "HUMAN" | "SERVICE";
    onRecordExecutionUpdate?: ReturnType<typeof vi.fn>;
    searchTerm?: string;
    taskScope?: "mine" | "team";
  } = {},
) {
  const onSearchTermChange = vi.fn();
  const onSelectedProjectIdChange = vi.fn();
  const onRecordExecutionUpdate =
    options.onRecordExecutionUpdate ??
    vi.fn().mockResolvedValue({ id: "task-1" });
  const onLoadHistory = options.onLoadHistory ?? vi.fn().mockResolvedValue([]);

  const view = render(
    <TodayWorkspace
      currentUserId={options.currentUserId ?? "user-1"}
      members={members}
      roleNames={options.roleNames}
      identityType={options.identityType}
      onRefreshTasks={
        options.onRefreshTasks ?? vi.fn().mockResolvedValue(project.tasks)
      }
      onLoadHistory={onLoadHistory}
      onRecordExecutionUpdate={onRecordExecutionUpdate}
      onSearchTermChange={onSearchTermChange}
      onSelectedProjectIdChange={onSelectedProjectIdChange}
      project={project}
      projects={[
        {
          id: "project-1",
          name: "Delivery Program",
          status: "active",
        },
      ]}
      searchTerm={options.searchTerm ?? ""}
      selectedProjectId="project-1"
      taskScope={options.taskScope}
    />,
  );

  return {
    ...view,
    onLoadHistory,
    onRecordExecutionUpdate,
    onSearchTermChange,
    onSelectedProjectIdChange,
  };
}

describe("TodayWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts collapsed and expands a work package inline", () => {
    const project = createProject([
      {
        id: "summary-1",
        parentTaskId: null,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "summary",
        title: "Discovery",
      },
      {
        id: "task-1",
        assigneeId: "user-1",
        parentTaskId: "summary-1",
        percentComplete: 20,
        priority: "high",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "standard",
        title: "Interview stakeholders",
      },
    ]);

    renderToday(project);

    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(
      screen.queryByText("Interview stakeholders"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand Discovery" }),
    ).toHaveTextContent("▸");

    fireEvent.click(screen.getByRole("button", { name: "Expand Discovery" }));

    expect(screen.getByText("Interview stakeholders")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse Discovery" }),
    ).toHaveTextContent("▾");
    expect(
      screen.queryByRole("button", { name: "Expand Interview stakeholders" }),
    ).not.toBeInTheDocument();
  });

  it("keeps summary rows read-only while child rows expose editable controls", () => {
    const project = createProject([
      {
        id: "summary-1",
        parentTaskId: null,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "summary",
        title: "Observability Tools",
      },
      {
        id: "task-1",
        assigneeId: "user-1",
        dueDate: "2026-07-16",
        parentTaskId: "summary-1",
        percentComplete: 0,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "todo",
        taskKind: "standard",
        title: "SL1-API",
      },
    ]);

    renderToday(project);
    fireEvent.click(
      screen.getByRole("button", { name: "Expand Observability Tools" }),
    );

    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Status for Observability Tools"),
    ).not.toBeInTheDocument();

    expect(screen.getByLabelText("Status for SL1-API")).toBeEnabled();
    expect(screen.getByLabelText("Owner for SL1-API")).toBeEnabled();
    expect(screen.getByLabelText("Priority for SL1-API")).toBeEnabled();
    expect(screen.getByLabelText("Due date for SL1-API")).toBeEnabled();
    expect(screen.getByLabelText("Progress for SL1-API")).toBeEnabled();
    expect(screen.getByLabelText("Today's update for SL1-API")).toBeEnabled();
    expect(screen.getByLabelText("Next step for SL1-API")).toBeEnabled();
    expect(screen.getByLabelText("Next owner for SL1-API")).toBeEnabled();
    expect(
      screen.queryByLabelText("Blocked for SL1-API"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Priority" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Blocked" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type today's update..."),
    ).toBeInTheDocument();
  });

  it("auto-saves status, owner, progress, update, next step, next owner, and blocked via Status", async () => {
    const onRecordExecutionUpdate = vi.fn().mockImplementation(
      async (
        _taskId: string,
        input: {
          nextStep?: string;
          percentComplete?: number;
          status?: string;
          updateNotes?: string | null;
        },
      ) => ({
        id: "task-1",
        status: input.status ?? "in_progress",
        percentComplete: input.percentComplete ?? 25,
        latestExecutionUpdate: {
          id: "update-1",
          nextStep: input.nextStep ?? "Continue",
          status: input.status ?? "in_progress",
          taskId: "task-1",
          updateNotes:
            input.updateNotes === undefined ? null : input.updateNotes,
          updatedOn: "2026-08-07T09:00:00.000Z",
        },
      }),
    );

    const project = createProject([
      {
        id: "task-1",
        assigneeId: "user-1",
        dueDate: "2026-07-16",
        parentTaskId: null,
        percentComplete: 10,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "todo",
        taskKind: "standard",
        title: "Draft cutover plan",
        latestExecutionUpdate: {
          id: "update-0",
          nextStep: "Confirm owners",
          percentComplete: 10,
          priority: "medium",
          status: "todo",
          taskId: "task-1",
          updatedOn: "2026-08-07T08:00:00.000Z",
        },
      } as ApiTask,
    ]);

    renderToday(project, { onRecordExecutionUpdate });

    fireEvent.change(screen.getByLabelText("Status for Draft cutover plan"), {
      target: { value: "in_progress" },
    });
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ status: "in_progress" }),
      );
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Owner for Draft cutover plan"), {
      target: { value: "user-2" },
    });
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ assigneeId: "user-2" }),
      );
    });

    fireEvent.change(screen.getByLabelText("Due date for Draft cutover plan"), {
      target: { value: "2026-08-20" },
    });
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ targetCompletionDate: "2026-08-20" }),
      );
    });

    const progress = screen.getByLabelText("Progress for Draft cutover plan");
    fireEvent.change(progress, { target: { value: "40" } });
    fireEvent.blur(progress);
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ percentComplete: 40 }),
      );
    });

    const updateNotes = screen.getByLabelText(
      /Today's update for Draft cutover plan/,
    );
    fireEvent.change(updateNotes, {
      target: { value: "Completed dry-run checklist" },
    });
    fireEvent.blur(updateNotes);
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({
          updateNotes: "Completed dry-run checklist",
        }),
      );
    });

    const nextStep = screen.getByLabelText("Next step for Draft cutover plan");
    fireEvent.change(nextStep, {
      target: { value: "Send plan for review" },
    });
    fireEvent.blur(nextStep);
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ nextStep: "Send plan for review" }),
      );
    });

    fireEvent.change(
      screen.getByLabelText("Next owner for Draft cutover plan"),
      { target: { value: "user-2" } },
    );
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ nextActionOwnerId: "user-2" }),
      );
    });

    fireEvent.change(updateNotes, {
      target: { value: "Waiting for credentials" },
    });
    fireEvent.blur(updateNotes);
    await waitFor(() =>
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ updateNotes: "Waiting for credentials" }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Status for Draft cutover plan"), {
      target: { value: "blocked" },
    });
    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ status: "blocked" }),
      );
    });
  });

  it("saves a terminal Done update without a Next Step", async () => {
    const onRecordExecutionUpdate = vi.fn().mockResolvedValue({
      id: "task-1",
      latestExecutionUpdate: {
        id: "update-1",
        nextStep: null,
        percentComplete: 100,
        priority: "medium",
        projectId: "project-1",
        status: "done",
        taskId: "task-1",
      },
      percentComplete: 100,
      status: "done",
    });
    const project = createProject([
      {
        assigneeId: "user-1",
        id: "task-1",
        latestExecutionUpdate: {
          id: "update-0",
          // Semantically blank execution text is normalized to null in the payload.
          nextStep: "   ",
          percentComplete: 40,
          priority: "medium",
          projectId: "project-1",
          status: "in_progress",
          taskId: "task-1",
        },
        parentTaskId: null,
        percentComplete: 40,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "standard",
        title: "Complete release evidence",
      },
    ]);

    renderToday(project, { onRecordExecutionUpdate });

    fireEvent.change(
      screen.getByLabelText("Status for Complete release evidence"),
      { target: { value: "done" } },
    );

    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({
          nextStep: null,
          percentComplete: 100,
          status: "done",
        }),
      );
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByText("Saved")).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it("cancels an in-progress text edit with Escape", async () => {
    const onRecordExecutionUpdate = vi.fn().mockResolvedValue({
      id: "task-1",
      status: "in_progress",
    });
    const project = createProject([
      {
        id: "task-1",
        assigneeId: "user-1",
        parentTaskId: null,
        percentComplete: 40,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "standard",
        title: "Draft cutover plan",
        latestExecutionUpdate: {
          id: "update-1",
          nextStep: "Confirm owners",
          percentComplete: 40,
          priority: "medium",
          status: "in_progress",
          taskId: "task-1",
          updatedOn: "2026-08-07T09:00:00.000Z",
        },
      } as ApiTask,
    ]);

    renderToday(project, { onRecordExecutionUpdate });

    const nextStep = screen.getByLabelText("Next step for Draft cutover plan");
    fireEvent.change(nextStep, {
      target: { value: "Should not save" },
    });
    fireEvent.keyDown(nextStep, { key: "Escape" });

    expect(nextStep).toHaveValue("Confirm owners");
    expect(onRecordExecutionUpdate).not.toHaveBeenCalled();
  });

  it("opens history without using the update drawer", async () => {
    const onLoadHistory = vi.fn().mockResolvedValue([
      {
        id: "history-1",
        nextStep: "Chase vendor",
        taskId: "task-1",
        updateNotes: "Waiting on reply",
        updatedById: "user-1",
        updatedOn: "2026-08-07T10:00:00.000Z",
      },
    ]);
    const project = createProject([
      {
        id: "task-1",
        parentTaskId: null,
        priority: "high",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "blocked",
        taskKind: "standard",
        title: "Vendor access",
      },
    ]);

    renderToday(project, { onLoadHistory });

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    expect(await screen.findByText("Execution history")).toBeInTheDocument();
    expect(onLoadHistory).toHaveBeenCalledWith("task-1");
    expect(screen.getByText("Chase vendor")).toBeInTheDocument();
    expect(screen.queryByText("Save & Next")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^save$/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes a compact Project / Scope / Search / Expand / Collapse toolbar", () => {
    renderToday(
      createProject([
        {
          id: "task-1",
          parentTaskId: null,
          priority: "medium",
          projectId: "project-1",
          sequenceNumber: 1,
          status: "todo",
          taskKind: "standard",
          title: "Standalone task",
        },
      ]),
    );

    expect(screen.getByLabelText("Select project")).toBeInTheDocument();
    expect(screen.getByLabelText("Task scope")).toHaveValue("team");
    expect(screen.getByLabelText("Search tasks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stand-up progress/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Project Manager daily command center/i),
    ).not.toBeInTheDocument();
  });

  it("defaults Team Members to My Tasks scope with assigned work only", () => {
    const project = createProject([
      {
        id: "task-mine",
        assigneeId: "user-2",
        parentTaskId: null,
        percentComplete: 10,
        priority: "high",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "todo",
        taskKind: "standard",
        title: "My assigned task",
      },
      {
        id: "task-other",
        assigneeId: "user-1",
        parentTaskId: null,
        percentComplete: 0,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 2,
        status: "todo",
        taskKind: "standard",
        title: "Someone else's task",
      },
    ]);

    renderToday(project, { currentUserId: "user-2" });

    expect(screen.getByLabelText("Task scope")).toHaveValue("mine");
    expect(screen.getByText("My assigned task")).toBeInTheDocument();
    expect(screen.queryByText("Someone else's task")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Owner" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "WBS" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Status for My assigned task")).toBeEnabled();
    expect(
      screen.getByRole("combobox", { name: "Priority for My assigned task" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Priority for My assigned task")).toHaveValue(
      "high",
    );
  });

  it("shows delegated child context read-only in My Tasks scope", () => {
    const project = createProject([
      {
        id: "task-a",
        assigneeId: "user-2",
        parentTaskId: null,
        percentComplete: 40,
        priority: "high",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "standard",
        title: "Task A",
      },
      {
        id: "task-a-1",
        assigneeId: "user-1",
        parentTaskId: "task-a",
        percentComplete: 10,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "todo",
        taskKind: "standard",
        title: "Sub-task A1",
      },
      {
        id: "task-other",
        assigneeId: "user-1",
        parentTaskId: null,
        percentComplete: 0,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 2,
        status: "todo",
        taskKind: "standard",
        title: "Someone else's task",
      },
    ]);

    renderToday(project, { currentUserId: "user-2" });

    expect(screen.getByText("Task A")).toBeInTheDocument();
    expect(screen.getByText("Sub-task A1")).toBeInTheDocument();
    expect(screen.getByText("Ava Patel")).toBeInTheDocument();
    expect(screen.queryByText("Someone else's task")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Status for Task A")).toBeEnabled();
    expect(screen.getByLabelText("Status for Sub-task A1")).toBeDisabled();
  });

  it("keeps Team Tasks read-only for contributors", () => {
    const project = createProject([
      {
        id: "task-mine",
        assigneeId: "user-2",
        parentTaskId: null,
        percentComplete: 10,
        priority: "high",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "todo",
        taskKind: "standard",
        title: "My assigned task",
      },
      {
        id: "task-other",
        assigneeId: "user-1",
        parentTaskId: null,
        percentComplete: 0,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 2,
        status: "todo",
        taskKind: "standard",
        title: "Someone else's task",
      },
    ]);

    renderToday(project, {
      currentUserId: "user-2",
      taskScope: "team",
    });

    expect(screen.getByText("My assigned task")).toBeInTheDocument();
    expect(screen.getByText("Someone else's task")).toBeInTheDocument();
    expect(screen.getByLabelText("Status for My assigned task")).toBeDisabled();
    expect(
      screen.getByLabelText("Status for Someone else's task"),
    ).toBeDisabled();
  });

  it("smart-focuses Today's Update after expanding a work package", async () => {
    const project = createProject([
      {
        id: "summary-1",
        parentTaskId: null,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "summary",
        title: "Discovery",
      },
      {
        id: "task-1",
        assigneeId: "user-1",
        parentTaskId: "summary-1",
        percentComplete: 20,
        priority: "high",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "standard",
        title: "Interview stakeholders",
        latestExecutionUpdate: {
          id: "update-1",
          nextStep: "Book follow-up",
          status: "in_progress",
          taskId: "task-1",
          updatedOn: "2026-08-06T09:00:00.000Z",
        },
      } as ApiTask,
    ]);

    renderToday(project);
    fireEvent.click(screen.getByRole("button", { name: "Expand Discovery" }));

    await waitFor(() => {
      expect(
        screen.getByLabelText("Today's update for Interview stakeholders"),
      ).toHaveFocus();
    });
    expect(
      screen.getByLabelText("Today\'s update for Interview stakeholders"),
    ).toHaveValue("");
    expect(
      screen.getByLabelText("Next step for Interview stakeholders"),
    ).toHaveValue("Book follow-up");
  });

  it("moves vertically with Enter and horizontally with Tab", async () => {
    const project = createProject([
      {
        id: "task-1",
        assigneeId: "user-1",
        parentTaskId: null,
        percentComplete: 10,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "standard",
        title: "Task One",
        latestExecutionUpdate: {
          id: "u1",
          nextStep: "One next",
          updateNotes: "One update",
          status: "in_progress",
          taskId: "task-1",
          updatedOn: "2026-08-07T09:00:00.000Z",
        },
      } as ApiTask,
      {
        id: "task-2",
        assigneeId: "user-1",
        parentTaskId: null,
        percentComplete: 20,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 2,
        status: "todo",
        taskKind: "standard",
        title: "Task Two",
        latestExecutionUpdate: {
          id: "u2",
          nextStep: "Two next",
          updateNotes: "Two update",
          status: "todo",
          taskId: "task-2",
          updatedOn: "2026-08-07T09:00:00.000Z",
        },
      } as ApiTask,
    ]);

    renderToday(project);

    const firstUpdate = screen.getByLabelText("Today's update for Task One");
    firstUpdate.focus();
    fireEvent.keyDown(firstUpdate, { key: "Enter" });

    await waitFor(() => {
      expect(
        screen.getByLabelText("Today's update for Task Two"),
      ).toHaveFocus();
    });

    const secondUpdate = screen.getByLabelText("Today's update for Task Two");
    fireEvent.keyDown(secondUpdate, { key: "Tab" });

    await waitFor(() => {
      expect(screen.getByLabelText("Next step for Task Two")).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByLabelText("Next step for Task Two"), {
      key: "Tab",
      shiftKey: true,
    });

    await waitFor(() => {
      expect(
        screen.getByLabelText("Today's update for Task Two"),
      ).toHaveFocus();
    });
  });

  it("defaults Next Owner to Owner when next owner is empty", () => {
    const project = createProject([
      {
        id: "task-1",
        assigneeId: "user-1",
        parentTaskId: null,
        percentComplete: 0,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "todo",
        taskKind: "standard",
        title: "Owned task",
      },
    ]);

    renderToday(project);
    expect(screen.getByLabelText("Next owner for Owned task")).toHaveValue(
      "user-1",
    );
  });
});

const basicWork: ApiTask = {
  id: "work",
  projectId: "project-1",
  title: "Work",
  taskKind: "standard",
  assigneeId: "user-1",
  status: "in_progress",
  percentComplete: 20,
  priority: "medium",
};
const latest = {
  id: "update",
  taskId: "work",
  projectId: "project-1",
  priority: "medium",
  percentComplete: 20,
  status: "in_progress" as const,
};

describe("Today Stage A+B", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows primary counts independent of collapse and combines search/secondary filters", () => {
    const today = new Date().toISOString().slice(0, 10);
    const project = createProject([
      { ...basicWork, id: "summary", title: "Package", taskKind: "summary" },
      {
        ...basicWork,
        parentTaskId: "summary",
        dueDate: today,
        priority: "critical",
        latestExecutionUpdate: {
          ...latest,
          nextActionOwnerId: "user-1",
          updatedOn: `${today}T10:00:00Z`,
        },
      },
      {
        ...basicWork,
        id: "blocked",
        title: "Blocked work",
        status: "blocked",
        dueDate: "2020-01-01",
      },
      {
        ...basicWork,
        id: "done",
        title: "Finished",
        status: "done",
        latestExecutionUpdate: { ...latest, updatedOn: `${today}T10:00:00Z` },
      },
    ]);
    renderToday(project);
    expect(
      screen.getByRole("button", { name: "All active (2)" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Overdue (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Today (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Blocked (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Waiting For Me (1)" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Finished")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(
      screen.getByRole("button", { name: "All active (2)" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Waiting For Me (1)" }));
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.queryByText("Blocked work")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All active (2)" }));
    fireEvent.change(screen.getByLabelText("Additional filter"), {
      target: { value: "updated" },
    });
    expect(screen.getByText("Finished")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "All active (2)" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Additional filter"), {
      target: { value: "critical" },
    });
    expect(
      screen.getByRole("button", { name: "All active (1)" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Finished")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Additional filter"), {
      target: { value: "next7" },
    });
    expect(
      screen.getByRole("button", { name: "All active (1)" }),
    ).toBeInTheDocument();
  });

  it("search respects attention counts and ancestor context without counting ancestors", () => {
    renderToday(
      createProject([
        { ...basicWork, id: "parent", title: "Release", taskKind: "summary" },
        {
          ...basicWork,
          parentTaskId: "parent",
          latestExecutionUpdate: { ...latest, nextStep: "Test interface" },
          dueDate: "2020-01-01",
        },
        { ...basicWork, id: "other", title: "Other" },
      ]),
      { searchTerm: "interface" },
    );
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "All active (1)" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Overdue (1)" }));
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });

  it("Mine counts exclude delegated context", () => {
    renderToday(
      createProject([
        { ...basicWork, id: "parent", assigneeId: "user-2" },
        {
          ...basicWork,
          id: "child",
          parentTaskId: "parent",
          title: "Delegated",
          assigneeId: "user-1",
        },
      ]),
      { currentUserId: "user-2" },
    );
    expect(screen.getByText("Delegated")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "All active (1)" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status for Delegated")).toBeDisabled();
  });

  it.each(["viewer", "CUSTOMER", "SERVICE", "archived", "deleted"])(
    "disables execution for %s",
    (restriction) => {
      const project = createProject([
        {
          ...basicWork,
          deletedAt: restriction === "deleted" ? "2026-10-02" : null,
        },
      ]);
      if (restriction === "viewer")
        project.members = [{ ...members[0], role: "viewer" }];
      if (restriction === "archived") project.status = "archived";
      // The workspace receives the actual project membership, even if governance implies leadership.
      render(
        <TodayWorkspace
          currentUserId="user-1"
          members={project.members ?? []}
          project={project}
          projects={[project]}
          selectedProjectId={project.id}
          searchTerm=""
          onSearchTermChange={vi.fn()}
          onLoadHistory={vi.fn().mockResolvedValue([])}
          onRefreshTasks={vi.fn().mockResolvedValue(project.tasks)}
          onRecordExecutionUpdate={vi.fn()}
          roleNames={restriction === "CUSTOMER" ? ["CUSTOMER"] : []}
          identityType={restriction === "SERVICE" ? "SERVICE" : "HUMAN"}
        />,
      );
      expect(screen.getByLabelText("Status for Work")).toBeDisabled();
      expect(screen.getByLabelText("Due date for Work")).toBeDisabled();
    },
  );

  it("does not accept previous Next Step as commentary or blocker reason", async () => {
    const onRecordExecutionUpdate = vi
      .fn()
      .mockResolvedValue({ ...basicWork, priority: "high" });
    renderToday(
      createProject([
        {
          ...basicWork,
          latestExecutionUpdate: {
            ...latest,
            nextStep: "Complete interface testing",
          },
        },
      ]),
      { onRecordExecutionUpdate },
    );
    const notes = screen.getByLabelText("Today's update for Work");
    expect(notes).toHaveValue("");
    expect(screen.getByLabelText("Next step for Work")).toHaveValue(
      "Complete interface testing",
    );
    fireEvent.focus(notes);
    fireEvent.blur(notes);
    expect(onRecordExecutionUpdate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Priority for Work"), {
      target: { value: "high" },
    });
    await waitFor(() =>
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "work",
        expect.objectContaining({
          updateNotes: null,
          nextStep: "Complete interface testing",
        }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Status for Work"), {
      target: { value: "blocked" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Validation: Add a blocker reason",
    );
    expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(1);
  });

  it("serializes same-task saves using latest committed state", async () => {
    let finishFirst!: (task: ApiTask) => void;
    const onRecordExecutionUpdate = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ApiTask>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockImplementation(
        async (
          _id: string,
          payload: Parameters<
            typeof import("@/components/projects/execution-update-payload").buildExecutionUpdatePayload
          >[1],
        ) => ({ ...basicWork, ...payload }),
      );
    renderToday(createProject([basicWork]), { onRecordExecutionUpdate });
    fireEvent.change(screen.getByLabelText("Priority for Work"), {
      target: { value: "high" },
    });
    await waitFor(() =>
      expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(1),
    );
    fireEvent.change(screen.getByLabelText("Progress for Work"), {
      target: { value: "30" },
    });
    fireEvent.blur(screen.getByLabelText("Progress for Work"));
    expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(1);
    await act(async () => finishFirst({ ...basicWork, priority: "high" }));
    await waitFor(() =>
      expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(2),
    );
    expect(onRecordExecutionUpdate.mock.calls[1][1]).toMatchObject({
      priority: "high",
      percentComplete: 30,
      nextStep: null,
      updateNotes: null,
    });
  });

  it("preserves drafts, cancels queued writes and refreshes state/history on an uncertain failure", async () => {
    let fail!: (error: Error) => void;
    const onRecordExecutionUpdate = vi.fn().mockImplementation(
      () =>
        new Promise<ApiTask>((_resolve, reject) => {
          fail = reject;
        }),
    );
    const onRefreshTasks = vi.fn().mockResolvedValue([basicWork]);
    const onLoadHistory = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        { ...latest, updateNotes: "Recorded despite timeout" },
      ]);
    renderToday(createProject([basicWork]), {
      onLoadHistory,
      onRecordExecutionUpdate,
      onRefreshTasks,
    });
    const notes = screen.getByLabelText("Today's update for Work");
    fireEvent.change(notes, { target: { value: "Explicit commentary" } });
    fireEvent.blur(notes);
    await waitFor(() =>
      expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(1),
    );
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText("No history")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Priority for Work"), {
      target: { value: "critical" },
    });
    await act(async () => fail(new Error("Connection lost")));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Server: Connection lost",
    );
    expect(notes).toHaveValue("Explicit commentary");
    expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(1);
    expect(onRefreshTasks).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Recorded despite timeout"),
    ).toBeInTheDocument();
    expect(onLoadHistory).toHaveBeenCalledWith("work");
  });

  it("discards a late response after switching project", async () => {
    let finish!: (task: ApiTask) => void;
    const onRecordExecutionUpdate = vi.fn().mockImplementation(
      () =>
        new Promise<ApiTask>((resolve) => {
          finish = resolve;
        }),
    );
    const { rerender } = renderToday(createProject([basicWork]), {
      onRecordExecutionUpdate,
    });
    fireEvent.change(screen.getByLabelText("Priority for Work"), {
      target: { value: "critical" },
    });
    await waitFor(() =>
      expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(1),
    );
    const next = {
      ...createProject([
        { ...basicWork, projectId: "project-2", title: "New project task" },
      ]),
      id: "project-2",
    };
    rerender(
      <TodayWorkspace
        currentUserId="user-1"
        members={members}
        project={next}
        projects={[next]}
        selectedProjectId={next.id}
        searchTerm=""
        onSearchTermChange={vi.fn()}
        onLoadHistory={vi.fn().mockResolvedValue([])}
        onRefreshTasks={vi.fn().mockResolvedValue(next.tasks)}
        onRecordExecutionUpdate={onRecordExecutionUpdate}
      />,
    );
    await act(async () =>
      finish({ ...basicWork, priority: "critical", title: "Old response" }),
    );
    expect(screen.queryByText("Old response")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Priority for New project task")).toHaveValue(
      "medium",
    );
  });
});

it("keeps an invalid progress draft without sending a request, and Escape cancels it", async () => {
  const { onRecordExecutionUpdate } = renderToday(createProject([basicWork]));
  const progress = screen.getByLabelText("Progress for Work");
  fireEvent.change(progress, { target: { value: "101" } });
  fireEvent.blur(progress);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Validation: Progress must be a whole number between 0 and 100",
  );
  expect(progress).toHaveValue(101);
  expect(onRecordExecutionUpdate).not.toHaveBeenCalled();
  fireEvent.keyDown(progress, { key: "Escape" });
  expect(progress).toHaveValue(20);
  await act(async () => {
    await Promise.resolve();
  });
  expect(onRecordExecutionUpdate).not.toHaveBeenCalled();
});

it.each(["status", "progress"])(
  "autosaves reopening a Done task through %s in Updated today",
  async (field) => {
    const today = new Date().toISOString().slice(0, 10);
    const completed: ApiTask = {
      ...basicWork,
      status: "done",
      percentComplete: 100,
      latestExecutionUpdate: {
        ...latest,
        status: "done",
        percentComplete: 100,
        updatedOn: `${today}T10:00:00Z`,
      },
    };
    const onRecordExecutionUpdate = vi
      .fn()
      .mockImplementation(async (_id, input) => ({ ...completed, ...input }));
    renderToday(createProject([completed]), { onRecordExecutionUpdate });
    fireEvent.change(screen.getByLabelText("Additional filter"), {
      target: { value: "updated" },
    });
    expect(screen.getByLabelText("Status for Work")).toBeEnabled();
    expect(screen.getByLabelText("Progress for Work")).toBeEnabled();
    fireEvent.change(
      screen.getByLabelText(
        field === "status" ? "Status for Work" : "Progress for Work",
      ),
      { target: { value: field === "status" ? "in_progress" : "75" } },
    );
    if (field === "progress")
      fireEvent.blur(screen.getByLabelText("Progress for Work"));
    await waitFor(() =>
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        "work",
        expect.objectContaining({
          status: "in_progress",
          percentComplete: field === "status" ? 99 : 75,
        }),
      ),
    );
    expect(onRecordExecutionUpdate).toHaveBeenCalledTimes(1);
  },
);
