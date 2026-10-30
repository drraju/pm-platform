import { apiRequest } from "@/lib/api/client";

export type SlackSetting = {
  channelId: string | null;
  configured: boolean;
  webhookSaved: boolean;
};

export function getProjectSlack(projectId: string) {
  return apiRequest<SlackSetting>(`/projects/${projectId}/slack`);
}

export function saveProjectSlack(
  projectId: string,
  input: { channelId?: string | null; webhookUrl?: string },
) {
  return apiRequest<SlackSetting>(`/projects/${projectId}/slack`, {
    body: JSON.stringify(input),
    method: "PUT",
  });
}

export function disconnectProjectSlack(projectId: string) {
  return apiRequest<SlackSetting>(`/projects/${projectId}/slack`, { method: "DELETE" });
}
