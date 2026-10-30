"use client";

import React, { useEffect, useState } from "react";
import { NotificationList } from "@/components/notifications/notification-list";
import { getNotifications, type ApiNotification } from "@/features/notifications";

export default function NotificationsPage() {
  const [items, setItems] = useState<ApiNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getNotifications()
      .then((rows) => {
        if (mounted) setItems(rows);
      })
      .catch((requestError: unknown) => {
        if (mounted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load notifications");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">Assignments, blocked work, and overdue work.</p>
      </div>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {items ? <NotificationList initial={items} onChange={setItems} /> : <p className="text-sm text-slate-500">Loading notifications...</p>}
    </div>
  );
}
