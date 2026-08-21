import type { RouteLocationNormalized } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRouteAccess } from "@/router/resolveRouteAccess";

const { getSession, getCurrentUser } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/authClient", () => ({ authClient: { getSession } }));
vi.mock("@/lib/trpcClient", () => ({
  trpc: { user: { getCurrentUser: { query: getCurrentUser } } },
}));

function requestedRoute(fullPath: string, meta: RouteLocationNormalized["meta"] = {}) {
  return { fullPath, meta };
}

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
  it("opens public routes without asking for the session", async () => {
    expect(await resolveRouteAccess(requestedRoute("/events", { isPublic: true }))).toBe(true);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("sends signed out visitors to the login form with a return path", async () => {
    expect(await resolveRouteAccess(requestedRoute("/my-tickets"))).toEqual({
      name: "login",
      query: { redirectTo: "/my-tickets" },
    });
  });

  it("keeps the login form away from a signed in attendee", async () => {
    signInAs("ATTENDEE");

    expect(await resolveRouteAccess(requestedRoute("/login", { isGuestOnly: true }))).toEqual({
      name: "landing",
    });
  });

  it("explains on the login form why an administrator session cannot open the ticket area", async () => {
    signInAs("ADMIN");

    expect(await resolveRouteAccess(requestedRoute("/my-tickets"))).toEqual({
      name: "login",
      query: { redirectTo: "/my-tickets", rejected: "administrator" },
    });
  });

  it("lets an administrator session sign in with a personal account", async () => {
    signInAs("ADMIN");

    expect(await resolveRouteAccess(requestedRoute("/login", { isGuestOnly: true }))).toBe(true);
    expect(await resolveRouteAccess(requestedRoute("/register", { isGuestOnly: true }))).toBe(true);
  });

  it("keeps an administrator session out of the organizer area", async () => {
    signInAs("ADMIN");

    expect(
      await resolveRouteAccess(requestedRoute("/organizer", { requiresOrganizer: true })),
    ).toEqual({
      name: "login",
      query: { redirectTo: "/organizer", rejected: "administrator" },
    });
  });

  it("keeps the organizer area away from attendees", async () => {
    signInAs("ATTENDEE");

    expect(
      await resolveRouteAccess(requestedRoute("/organizer", { requiresOrganizer: true })),
    ).toEqual({ name: "landing" });
  });

  it("lets an organizer into the organizer area", async () => {
    signInAs("ORGANIZER");

    expect(
      await resolveRouteAccess(requestedRoute("/organizer", { requiresOrganizer: true })),
    ).toBe(true);
  });

  it("skips the organizer onboarding for organizers", async () => {
    signInAs("ORGANIZER");

    expect(
      await resolveRouteAccess(
        requestedRoute("/become-organizer", { isOrganizerOnboarding: true }),
      ),
    ).toEqual({ name: "organizerEvents" });
  });

  it("sends an administrator session away from the organizer onboarding", async () => {
    signInAs("ADMIN");

    expect(
      await resolveRouteAccess(
        requestedRoute("/become-organizer", { isOrganizerOnboarding: true }),
      ),
    ).toEqual({ name: "login", query: { redirectTo: "/become-organizer", rejected: "administrator" } });
  });
});
