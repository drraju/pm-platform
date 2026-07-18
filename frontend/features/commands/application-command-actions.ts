export const applicationCommandActionEvent =
  "pm-platform:application-command-action";

export type ApplicationCommandAction =
  | { type: "project.create" }
  | {
      projectId?: string;
      raidType: "issue" | "risk";
      type: "raid.create";
    };

export function dispatchApplicationCommandAction(
  action: ApplicationCommandAction,
) {
  window.dispatchEvent(
    new CustomEvent<ApplicationCommandAction>(applicationCommandActionEvent, {
      detail: action,
    }),
  );
}

export function subscribeToApplicationCommandActions(
  listener: (action: ApplicationCommandAction) => void,
) {
  const eventListener = (event: Event) => {
    listener((event as CustomEvent<ApplicationCommandAction>).detail);
  };

  window.addEventListener(applicationCommandActionEvent, eventListener);
  return () =>
    window.removeEventListener(applicationCommandActionEvent, eventListener);
}
