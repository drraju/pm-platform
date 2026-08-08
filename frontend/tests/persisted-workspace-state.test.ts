import { beforeEach, describe, expect, it } from "vitest";
import {
  readPersistedWorkspaceState,
  writePersistedWorkspaceState,
} from "@/lib/workspace/persisted-workspace-state";

describe("persisted workspace state", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns fallback values when nothing is stored", () => {
    expect(
      readPersistedWorkspaceState("execution:demo", {
        activeFilter: "active",
        searchTerm: "",
      }),
    ).toEqual({
      activeFilter: "active",
      searchTerm: "",
    });
  });

  it("round-trips workspace preferences", () => {
    writePersistedWorkspaceState("execution:demo", {
      activeFilter: "blocked",
      searchTerm: "cutover",
    });

    expect(
      readPersistedWorkspaceState("execution:demo", {
        activeFilter: "active",
        searchTerm: "",
      }),
    ).toEqual({
      activeFilter: "blocked",
      searchTerm: "cutover",
    });
  });

  it("merges partial stored values onto the fallback", () => {
    window.localStorage.setItem(
      "pm-platform.workspace.execution:demo",
      JSON.stringify({ activeFilter: "overdue" }),
    );

    expect(
      readPersistedWorkspaceState("execution:demo", {
        activeFilter: "active",
        searchTerm: "default",
      }),
    ).toEqual({
      activeFilter: "overdue",
      searchTerm: "default",
    });
  });
});
