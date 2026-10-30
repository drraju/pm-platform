"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationReason,
  type ApiNotification,
} from "@/features/notifications";

export function NotificationList({
  initial,
  onChange,
}: {
  initial: ApiNotification[];
  onChange: (next: ApiNotification[]) => void;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const unread = initial.some((item) => !item.readAt);

  async function open(item: ApiNotification) {
    setIsSaving(true);
    try {
      if (!item.readAt) {
        const saved = await markNotificationRead(item.id);
        onChange(initial.map((row) => (row.id === saved.id ? { ...row, readAt: saved.readAt } : row)));
        window.dispatchEvent(new Event("pm-notifications"));
      }
      if (item.taskId) {
        router.push(`/today?work=${item.taskId}`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function markAll() {
    setIsSaving(true);
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      onChange(initial.map((row) => ({ ...row, readAt: row.readAt ?? readAt })));
      window.dispatchEvent(new Event("pm-notifications"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      {unread ? (
        <div className="flex justify-end border-b border-slate-100 px-4 py-2">
          <button
            className="text-sm font-medium text-brand hover:text-teal-800 disabled:opacity-50"
            disabled={isSaving}
            onClick={() => void markAll()}
            type="button"
          >
            Mark all read
          </button>
        </div>
      ) : null}
      {initial.length === 0 ? (
        <p className="px-4 py-8 text-sm text-slate-500">No notifications.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {initial.map((item) => (
            <li key={item.id}>
              <button
                className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                disabled={isSaving}
                onClick={() => void open(item)}
                type="button"
              >
                <span className="min-w-0">
                  <span className={`block truncate text-sm text-slate-950 ${item.readAt ? "font-medium" : "font-semibold"}`}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{notificationReason(item.reason)}</span>
                </span>
                <time className="shrink-0 text-xs text-slate-500" dateTime={item.createdAt}>
                  {formatWhen(item.createdAt)}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
