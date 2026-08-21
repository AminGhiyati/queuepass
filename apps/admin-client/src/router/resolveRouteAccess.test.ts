import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRouteAccess } from "@/router/resolveRouteAccess";

const { getSession, signOutOfSession, getCurrentUser } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOutOfSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/authClient", () => ({
  authClient: { getSession },
  signOut: signOutOfSession,
}));
vi.mock("@/lib/trpcClient", () => ({
  trpc: { user: { getCurrentUser: { query: getCurrentUser } } },
}));

function signOutEveryone() {
  getSession.mockResolvedValue({ data: null });
}

function signInAs(role: "ATTENDEE" | "ORGANIZER" | "ADMIN") {
  getSession.mockResolvedValue({ data: { user: { id: "user-id" } } });
  getCurrentUser.mockResolvedValue({ id: "user-id", name: "Test", email: "test@example.com", role });
}

beforeEach(() => {
  vi.clearAllMocks();
  signOutEveryone();
});

describe("resolveRouteAccess", () => {
  it("sends anonymous visitors to the login form", async () => {
    expect(await resolveRouteAccess({ name: "revenue" })).toEqual({ name: "login" });
    expect(signOutOfSession).not.toHaveBeenCalled();
  });

  it("shows the login form to anonymous visitors", async () => {
    expect(await resolveRouteAccess({ name: "login" })).toBe(true);
  });

  it("lets an administrator into the backoffice", async () => {
    signInAs("ADMIN");

    expect(await resolveRouteAccess({ name: "orders" })).toBe(true);
    expect(signOutOfSession).not.toHaveBeenCalled();
  });

  it("moves a signed in administrator off the login form", async () => {
    signInAs("ADMIN");

    expect(await resolveRouteAccess({ name: "login" })).toEqual({ name: "revenue" });
  });

  it("ends a session without administrator permissions and says why", async () => {
    signInAs("ORGANIZER");

    expect(await resolveRouteAccess({ name: "revenue" })).toEqual({
      name: "login",
      query: { rejected: "notAnAdmin" },
    });
    expect(signOutOfSession).toHaveBeenCalledOnce();
  });

  it("ends a session without administrator permissions that opens the login form", async () => {
    signInAs("ATTENDEE");

    expect(await resolveRouteAccess({ name: "login" })).toBe(true);
    expect(signOutOfSession).toHaveBeenCalledOnce();
  });
});
