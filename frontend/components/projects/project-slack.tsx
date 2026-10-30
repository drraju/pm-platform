"use client";

import React, { useState } from "react";
import type { SlackSetting } from "@/features/integrations/slack";

export function ProjectSlack({
  canEdit,
  isSaving,
  onDisconnect,
  onSave,
  setting,
}: {
  canEdit: boolean;
  isSaving: boolean;
  onDisconnect: () => Promise<void>;
  onSave: (input: { channelId: string; webhookUrl?: string }) => Promise<void>;
  setting: SlackSetting;
}) {
  const [channelId, setChannelId] = useState(setting.channelId ?? "");
  const [webhookUrl, setWebhookUrl] = useState("");

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Slack</h2>
      <p className="mt-2 text-sm text-slate-700">
        {setting.configured
          ? "Slack is on. Assignments, blocked work, and overdue work also post to the project channel."
          : "Slack is off. Assignments, blocked work, and overdue work stay in Notifications."}
      </p>
      {canEdit ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextWebhook = webhookUrl.trim();
            void onSave({
              channelId: channelId.trim(),
              ...(nextWebhook ? { webhookUrl: nextWebhook } : {}),
            }).then(() => setWebhookUrl(""));
          }}
        >
          <label className="block text-sm text-slate-700">
            Channel
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={80}
              onChange={(event) => setChannelId(event.target.value)}
              placeholder="Channel id"
              value={channelId}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Webhook
            <input
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder={setting.webhookSaved ? "Webhook saved" : "Incoming webhook"}
              type="password"
              value={webhookUrl}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isSaving}
              type="submit"
            >
              Save Slack
            </button>
            {setting.configured ? (
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                disabled={isSaving}
                onClick={() => void onDisconnect()}
                type="button"
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </form>
      ) : setting.channelId ? (
        <p className="mt-3 text-sm text-slate-600">{setting.channelId}</p>
      ) : null}
    </section>
  );
}
