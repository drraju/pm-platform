import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodayWorkspace } from "@/components/today/today-workspace";
import { decoratePlanningTasks } from "@/features/projects/planning";
import type { ApiProjectDetails, ApiProjectMember, ApiTask } from "@/features/projects";

const { createTask } = vi.hoisted(() => ({ createTask: vi.fn() }));
vi.mock("@/features/projects", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/projects")>(),
  createProjectTask: createTask,
}));

const manager: ApiProjectMember = { id: "member", userId: "user", role: "manager" };
const parent: ApiTask = { id: "parent", title: "Current work", projectId: "project", taskKind: "standard", status: "in_progress", priority: "medium", percentComplete: 50 };
const newTask: ApiTask = { id: "new", title: "New work", projectId: "project", taskKind: "standard", status: "todo", priority: "medium", percentComplete: 0 };

function setup(options: {
  tasks?: ApiTask[];
  membership?: ApiProjectMember;
  roles?: string[];
  identityType?: "HUMAN" | "SERVICE";
  status?: string;
  currentUserId?: string;
  scope?: "mine" | "team";
  search?: string;
  refresh?: ReturnType<typeof vi.fn>;
} = {}) {
  const tasks = options.tasks ?? [parent];
  const members = [options.membership ?? manager];
  const project: ApiProjectDetails = { id: "project", name: "Selected project", status: options.status ?? "active", tasks, members };
  const refresh = options.refresh ?? vi.fn().mockResolvedValue(decoratePlanningTasks([...tasks, newTask]));
  const view = render(<TodayWorkspace
    project={project} projects={[project]} selectedProjectId="project"
    currentUserId={options.currentUserId ?? "user"} members={members}
    roleNames={options.roles} identityType={options.identityType}
    taskScope={options.scope} searchTerm={options.search ?? ""}
    onSearchTermChange={vi.fn()} onRefreshTasks={refresh}
    onRecordExecutionUpdate={vi.fn()} onLoadHistory={vi.fn().mockResolvedValue([])}
  />);
  return { ...view, refresh };
}

function subtaskAction(title: string) {
  const row = screen.getByText(title).closest('[role="row"]') as HTMLElement;
  return within(row).getByRole("button", { name: "Add subtask" });
}

function expectNoSubtaskAction(title: string) {
  const row = screen.getByText(title).closest('[role="row"]') as HTMLElement;
  expect(within(row).queryByRole("button", { name: "Add subtask" })).not.toBeInTheDocument();
}

function submit() {
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "New work" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
}

beforeEach(() => { createTask.mockReset(); createTask.mockResolvedValue(newTask); window.localStorage.clear(); });

describe("Today contextual task creation", () => {
  it("opens the existing form and creates a top-level task in the current project", async () => {
    const { refresh } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Project")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Parent Summary")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Type")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Status")).toHaveValue("todo");
    submit();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(createTask).toHaveBeenCalledExactlyOnceWith("project", expect.objectContaining({ title: "New work", parentTaskId: null, taskKind: "standard", status: "todo", percentComplete: 0, priority: "medium" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("New work")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All active (2)" })).toBeInTheDocument();
  });

  it("provides a compact, focusable subtask action and native task-name tooltip", () => {
    setup();
    const button = subtaskAction("Current work");
    expect(button).toHaveAttribute("aria-label", "Add subtask");
    expect(button).toHaveAttribute("title", "Add subtask");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("h-7", "w-7", "focus:ring-2");
    expect(button).toHaveTextContent("+");
    expect(screen.getByText("Current work")).toHaveAttribute("title", "Current work");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(screen.getByText("Parent task: Current work")).toBeInTheDocument();
  });

  it("creates a subtask with a fixed parent and recomputes hierarchy and roll-up", async () => {
    const existing: ApiTask = { ...newTask, id: "existing", title: "Existing subtask", parentTaskId: parent.id, status: "done", percentComplete: 100 };
    const created: ApiTask = { ...newTask, parentTaskId: parent.id };
    createTask.mockResolvedValue(created);
    // A failed GET also exercises the existing decoration utility on the merge.
    setup({ tasks: [parent, existing], refresh: vi.fn().mockRejectedValue(new Error("offline")) });
    fireEvent.click(subtaskAction("Current work"));
    expect(screen.getByText("Parent task: Current work")).toBeInTheDocument();
    expect(screen.queryByLabelText("Parent Summary")).not.toBeInTheDocument();
    submit();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(createTask).toHaveBeenCalledExactlyOnceWith("project", expect.objectContaining({ parentTaskId: "parent", taskKind: "standard" }));
    const parentRow = screen.getByText("Current work").closest('[role="row"]')!;
    const childRow = screen.getByText("New work").closest('[role="row"]')!;
    expect(parentRow.compareDocumentPosition(childRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(childRow as HTMLElement).getByText("1.1")).toBeInTheDocument();
    expect(within(parentRow as HTMLElement).getByLabelText("Progress for Current work")).toHaveValue(50);
    expect(screen.getByRole("button", { name: "Refresh task state" })).toBeInTheDocument();
    expect(createTask).toHaveBeenCalledTimes(1);
  });

  it("refreshes a created subtask beneath a summary-owned task without counting ancestors as matches", async () => {
    const summary: ApiTask = { ...parent, id: "summary", title: "Work package", taskKind: "summary" };
    const work = { ...parent, parentTaskId: summary.id };
    const child = { ...newTask, parentTaskId: parent.id };
    createTask.mockResolvedValue(child);
    setup({ tasks: [summary, work], refresh: vi.fn().mockResolvedValue(decoratePlanningTasks([summary, work, child])) });
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    fireEvent.click(subtaskAction("Current work")); submit();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("New work")).toBeInTheDocument();
    expect(screen.getByText("1.1.1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All active (2)" })).toBeInTheDocument();
    expectNoSubtaskAction("New work");
  });

  it.each(["Overdue", "Blocked"])("reapplies %s without forcing a new task into the result", async (filter) => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${filter} \\(`) }));
    fireEvent.click(screen.getByRole("button", { name: "Add Task" }));
    submit();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("New work")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${filter} (0)` })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All active (2)" })).toBeInTheDocument();
  });

  it.each([false, true])("reapplies Mine using the created task's assignment (assigned=%s)", async (assigned) => {
    const created = { ...newTask, assigneeId: assigned ? "user" : null };
    createTask.mockResolvedValue(created);
    setup({ tasks: [], scope: "mine", refresh: vi.fn().mockResolvedValue([created]) });
    fireEvent.click(screen.getByRole("button", { name: "Add Task" })); submit();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("New work") !== null).toBe(assigned);
    expect(screen.getByRole("button", { name: `All active (${assigned ? 1 : 0})` })).toBeInTheDocument();
  });

  it("preserves search and computes counts from matching work", async () => {
    setup({ search: "Current" });
    fireEvent.click(screen.getByRole("button", { name: "Add Task" })); submit();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Search tasks")).toHaveValue("Current");
    expect(screen.queryByText("New work")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All active (1)" })).toBeInTheDocument();
  });

  it.each([
    { membership: { ...manager, role: "viewer" } },
    { membership: { ...manager, role: "contributor" } },
    { roles: ["CUSTOMER"] },
    { roles: ["PARTNER"] },
    { identityType: "SERVICE" as const },
    { status: "archived" },
    { currentUserId: "nonmember" },
  ])("hides creation for a restricted actor/project: %j", (options) => {
    setup(options);
    expect(screen.queryByRole("button", { name: "Add Task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add subtask" })).not.toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("does not offer another hierarchy level or children of milestones", () => {
    setup({ tasks: [parent, { ...newTask, parentTaskId: parent.id }, { ...newTask, id: "milestone", title: "Milestone", taskKind: "milestone" }] });
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(subtaskAction("Current work")).toBeInTheDocument();
    expectNoSubtaskAction("New work");
    expectNoSubtaskAction("Milestone");
  });

  it("retains state on failure and requires reconciliation before another submission", async () => {
    createTask.mockRejectedValue(new Error("Connection lost"));
    const { refresh } = setup({ refresh: vi.fn().mockResolvedValue([parent, newTask]) });
    fireEvent.click(screen.getByRole("button", { name: "Add Task" })); submit();
    await screen.findByText("Connection lost");
    expect(screen.getByText("Current work")).toBeInTheDocument();
    expect(screen.queryByText("New work")).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Create" })).toBeDisabled();
    fireEvent.submit(document.getElementById("project-task-form")!);
    expect(createTask).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Add Task" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh task state" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Add Task" })).toBeEnabled());
    expect(screen.getByText("New work")).toBeInTheDocument();
    expect(createTask).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate submissions while the POST is pending", async () => {
    let resolve!: (task: ApiTask) => void;
    createTask.mockReturnValue(new Promise<ApiTask>((done) => { resolve = done; }));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Add Task" })); submit();
    fireEvent.submit(document.getElementById("project-task-form")!);
    expect(createTask).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(newTask); });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
