import { describe, expect, it } from "vitest";
import { attendeeUser, createTestCaller, organizerUser } from "../../testing/createTestCaller.js";

describe("createEventImageUploadUrl", () => {
  it("hands an organizer a signed url and the key to store", async () => {
    const caller = createTestCaller({ currentUser: organizerUser });

    const upload = await caller.event.createEventImageUploadUrl({ contentType: "image/png" });

    expect(upload.imageKey).toMatch(/^events\/[\w-]+\.png$/);
    expect(upload.uploadUrl).toContain(upload.imageKey);
    expect(upload.uploadUrl).toContain("X-Amz-Signature");
  });

  it("derives the file extension from the content type", async () => {
    const caller = createTestCaller({ currentUser: organizerUser });

    const upload = await caller.event.createEventImageUploadUrl({ contentType: "image/jpeg" });

    expect(upload.imageKey).toMatch(/\.jpg$/);
  });

  it("refuses a content type that is not an image", async () => {
    const caller = createTestCaller({ currentUser: organizerUser });

    await expect(
      caller.event.createEventImageUploadUrl({
        contentType: "application/pdf" as "image/png",
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  });

  it("keeps attendees from uploading", async () => {
    const caller = createTestCaller({ currentUser: attendeeUser });

    await expect(
      caller.event.createEventImageUploadUrl({ contentType: "image/png" }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });
});
