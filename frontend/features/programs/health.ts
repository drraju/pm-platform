import { countWork, todayDate, type WorkCountTask } from "@/features/work/work-count";

export function programProjectLine(work: readonly WorkCountTask[], today = todayDate()) {
  return countWork(work, today).line;
}

export function programOverdueCount(
  projects: Array<{ work?: readonly WorkCountTask[] }>,
  today = todayDate(),
) {
  return projects.reduce((sum, project) => sum + countWork(project.work ?? [], today).overdue, 0);
}
