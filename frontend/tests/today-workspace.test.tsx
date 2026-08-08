import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    canEdit?: boolean;
    currentUserId?: string | null;
    onLoadHistory?: ReturnType<typeof vi.fn>;
    onRecordExecutionUpdate?: ReturnType<typeof vi.fn>;
    searchTerm?: string;
    taskScope?: "mine" | "team";
  } = {},
) {
  const onSearchTermChange = vi.fn();
  const onSelectedProjectIdChange = vi.fn();
  const onRecordExecutionUpdate =
    options.onRecordExecutionUpdate ?? vi.fn().mockResolvedValue({ id: "task-1" });
  const onLoadHistory =
    options.onLoadHistory ?? vi.fn().mockResolvedValue([]);

  render(
    <TodayWorkspace
      canEdit={options.canEdit ?? true}
      currentUserId={options.currentUserId ?? "user-1"}
      members={members}
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

    fireEvent.click(screen.getByRole("button", { name: "Expand Discovery" }));

    expect(screen.getByText("Interview stakeholders")).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Blocked for SL1-API")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Priority" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Blocked" })).not.toBeInTheDocument();
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

    fireEvent.change(
      screen.getByLabelText("Due date for Draft cutover plan"),
      { target: { value: "2026-08-20" } },
    );
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
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Collapse" })).toBeInTheDocument();
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

    renderToday(project, { canEdit: false, currentUserId: "user-2" });

    expect(screen.getByLabelText("Task scope")).toHaveValue("mine");
    expect(screen.getByText("My assigned task")).toBeInTheDocument();
    expect(screen.queryByText("Someone else's task")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Owner" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "WBS" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Status for My assigned task")).toBeEnabled();
    expect(
      screen.queryByRole("combobox", { name: "Priority for My assigned task" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Priority for My assigned task")).toHaveTextContent(
      "high",
    );
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
      canEdit: false,
      currentUserId: "user-2",
      taskScope: "team",
    });

    expect(screen.getByText("My assigned task")).toBeInTheDocument();
    expect(screen.getByText("Someone else's task")).toBeInTheDocument();
    expect(screen.getByLabelText("Status for My assigned task")).toBeDisabled();
    expect(screen.getByLabelText("Status for Someone else's task")).toBeDisabled();
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
        screen.getByLabelText(
          "Today's update for Interview stakeholders. Inherited from previous Next Step",
        ),
      ).toHaveFocus();
    });
    expect(screen.getByText("From next step")).toBeInTheDocument();
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
