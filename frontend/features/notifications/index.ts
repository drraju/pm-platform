import { apiRequest } from "@/lib/api/client";

export type ApiNotification = {
  createdAt: string;
  id: string;
  readAt: string | null;
  reason: "assigned" | "blocked" | "overdue" | string | null;
  taskId: string | null;
  title: string;
};

export function getNotifications() {
  return apiRequest<ApiNotification[]>("/notifications");
}

export function getUnreadNotificationCount() {
  return apiRequest<{ count: number }>("/notifications/unread-count").then((result) => result.count);
}

export function markNotificationRead(id: string) {
  return apiRequest<ApiNotification>(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return apiRequest<{ count: number }>("/notifications/read", { method: "POST" });
}

export function notificationReason(reason: ApiNotification["reason"]) {
  if (reason === "assigned") return "Assigned";
  if (reason === "waiting_blocked") return "Waiting · Blocked";
  if (reason === "blocked") return "Blocked";
  if (reason === "waiting_overdue") return "Waiting · Overdue";
  if (reason === "overdue") return "Overdue";
  return "Update";
}
