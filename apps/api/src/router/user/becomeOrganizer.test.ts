import { describe, expect, it, vi } from "vitest";
import {
  adminUser,
  attendeeUser,
  createTestCaller,
  organizerUser,
} from "../../testing/createTestCaller.js";

function callerWithUpdatedRows(count: number, currentUser = attendeeUser) {
  const updateMany = vi.fn().mockResolvedValue({ count });

  return {
    updateMany,
    caller: createTestCaller({ currentUser, prisma: { user: { updateMany } } }),
  };
}

describe("becomeOrganizer", () => {
  it("promotes an attendee to organizer", async () => {
    const { caller, updateMany } = callerWithUpdatedRows(1);

    await expect(caller.user.becomeOrganizer()).resolves.toEqual({
      ...attendeeUser,
      role: "ORGANIZER",
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: attendeeUser.id, role: "ATTENDEE" },
      data: { role: "ORGANIZER" },
    });
  });

  it("refuses to change the role of an administrator", async () => {
    const { caller } = callerWithUpdatedRows(0, adminUser);

    await expect(caller.user.becomeOrganizer()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("refuses a second promotion of the same organizer", async () => {
    const { caller } = callerWithUpdatedRows(0, organizerUser);

    await expect(caller.user.becomeOrganizer()).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("rejects anonymous callers", async () => {
    const caller = createTestCaller();

    await expect(caller.user.becomeOrganizer()).rejects.toThrow(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );
  });
});
