import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationList } from "@/components/notifications/notification-list";
import { ProjectSlack } from "@/components/projects/project-slack";

const notificationApi = vi.hoisted(() => ({
  markAllNotificationsRead: vi.fn(async () => ({ count: 0 })),
  markNotificationRead: vi.fn(async () => ({
    createdAt: "2026-10-29T12:00:00.000Z",
    id: "note-1",
    readAt: "2026-10-29T12:05:00.000Z",
    reason: "blocked",
    taskId: "task-1",
    title: "Test2",
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/notifications", () => ({
  markAllNotificationsRead: notificationApi.markAllNotificationsRead,
  markNotificationRead: notificationApi.markNotificationRead,
  notificationReason: (reason: string) => (reason === "blocked" ? "Blocked" : "Assigned"),
}));

describe("NotificationList", () => {
  it("is an empty list", () => {
    render(<NotificationList initial={[]} onChange={vi.fn()} />);
    expect(screen.getByText("No notifications.")).toBeInTheDocument();
    expect(screen.queryByText(/will appear/i)).not.toBeInTheDocument();
  });

  it("marks a blocked alert read when it is opened", async () => {
    const onChange = vi.fn();
    render(
      <NotificationList
        initial={[
          {
            createdAt: "2026-10-29T12:00:00.000Z",
            id: "note-1",
            readAt: null,
            reason: "blocked",
            taskId: "task-1",
            title: "Test2",
          },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /test2/i }));

    expect(notificationApi.markNotificationRead).toHaveBeenCalledWith("note-1");
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });
});

describe("ProjectSlack", () => {
  it("explains that Slack is off and keeps the webhook empty", () => {
    render(
      <ProjectSlack
        canEdit
        isSaving={false}
        onDisconnect={vi.fn()}
        onSave={vi.fn()}
        setting={{ channelId: null, configured: false, webhookSaved: false }}
      />,
    );

    expect(screen.getByText(/Slack is off/)).toBeInTheDocument();
    expect(screen.getByLabelText("Webhook")).toHaveValue("");
  });

  it("does not render a saved webhook", () => {
    render(
      <ProjectSlack
        canEdit
        isSaving={false}
        onDisconnect={vi.fn()}
        onSave={vi.fn()}
        setting={{ channelId: "C123", configured: true, webhookSaved: true }}
      />,
    );

    expect(screen.getByText(/Slack is on/)).toBeInTheDocument();
    expect(screen.getByLabelText("Webhook")).toHaveValue("");
    expect(screen.getByLabelText("Webhook")).toHaveAttribute("placeholder", "Webhook saved");
  });
});
