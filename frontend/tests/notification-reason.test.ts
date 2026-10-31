import { describe, expect, it } from "vitest";
import { notificationReason } from "@/features/notifications";

describe("notificationReason", () => {
  it("names a waiting alert separately from the predecessor owner's alert", () => {
    expect(notificationReason("blocked")).toBe("Blocked");
    expect(notificationReason("waiting_blocked")).toBe("Waiting · Blocked");
    expect(notificationReason("overdue")).toBe("Overdue");
    expect(notificationReason("waiting_overdue")).toBe("Waiting · Overdue");
  });
});
