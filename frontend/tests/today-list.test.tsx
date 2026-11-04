import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodayList } from "@/components/today/today-list";
import type { ApiProject, ApiTask } from "@/features/projects";
import { countWork, todayDate } from "@/features/work/work-count";
import { tasksInPhase } from "@/features/work/today-outline";

function task(overrides: Partial<ApiTask> & Pick<ApiTask, "id" | "title">): ApiTask {
  return {
    priority: "medium",
    projectId: "project-1",
    status: "todo",
    taskKind: "standard",
    ...overrides,
  };
}

const tasks: ApiTask[] = [
  task({ id: "integrations", outlineRole: "phase", taskKind: "summary", title: "Integrations" }),
  task({ id: "oem", outlineRole: "summary", parentTaskId: "integrations", taskKind: "summary", title: "OEM Correlation" }),
  task({ id: "oem-task", parentTaskId: "oem", title: "OEM Staging Rules" }),
  task({ id: "use-cases", outlineRole: "phase", taskKind: "summary", title: "Use cases" }),
  task({ id: "billing", outlineRole: "summary", parentTaskId: "use-cases", taskKind: "summary", title: "Billing" }),
  task({ dueDate: "2020-01-01", id: "bill-task", parentTaskId: "billing", title: "Map invoices" }),
];

const project = { id: "project-1", name: "CapGemini Phase 1", status: "active" } as ApiProject;

function renderList(overrides: Partial<React.ComponentProps<typeof TodayList>> = {}) {
  render(
    <TodayList
      canAdd
      canEdit={() => true}
      containers={[]}
      count={{ line: "1 of 2 overdue", operational: 2, overdue: 1 }}
      error={null}
      isSaving={false}
      onAdd={vi.fn()}
      onAddSubtask={vi.fn().mockResolvedValue(undefined)}
      onComment={vi.fn()}
      onLoadComments={vi.fn()}
      onScopeChange={vi.fn()}
      onUpdate={vi.fn()}
      projects={[project]}
      rows={[]}
      scope="project-1"
      tasks={tasks}
      {...overrides}
    />,
  );
}

describe("Today list toolbar", () => {
  it("puts phase and collapse controls on the add-work line and scopes the list", () => {
    renderList();

    const add = screen.getByRole("button", { name: "Add work" });
    const phase = screen.getByLabelText("Phase");
    const collapse = screen.getByRole("button", { name: "Collapse all" });
    const expand = screen.getByRole("button", { name: "Expand all" });
    expect(add.compareDocumentPosition(phase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(phase.compareDocumentPosition(collapse) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(collapse.compareDocumentPosition(expand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("option", { name: "All phases" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Integrations" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Use cases" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "OEM Correlation" })).toBeNull();

    fireEvent.change(phase, { target: { value: "use-cases" } });
    expect(screen.getByText(countWork(tasksInPhase(tasks, "use-cases"), todayDate()).line)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Map invoices" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "OEM Staging Rules" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open 1" })).toBeTruthy();

    fireEvent.click(collapse);
    expect(screen.getByRole("button", { name: "Show Billing" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Map invoices" })).toBeNull();

    fireEvent.click(expand);
    expect(screen.getByRole("button", { name: "Hide Billing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Map invoices" })).toBeTruthy();
  });

  it("leaves Mine as a flat list", () => {
    renderList({ scope: "mine" });
    expect(screen.getByRole("button", { name: "Add work" })).toBeTruthy();
    expect(screen.queryByLabelText("Phase")).toBeNull();
    expect(screen.queryByRole("button", { name: "Collapse all" })).toBeNull();
  });

  it("still offers collapse when the project has no phases", () => {
    renderList({
      tasks: [task({ id: "loose", title: "Loose task" })],
    });
    expect(screen.queryByLabelText("Phase")).toBeNull();
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand all" })).toBeTruthy();
  });
});
