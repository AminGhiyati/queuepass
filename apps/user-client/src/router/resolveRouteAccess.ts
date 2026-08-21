import type { RouteLocationNormalized } from "vue-router";
import { fetchCurrentUser, isAdministrator } from "@/lib/currentUser";

type RequestedRoute = Pick<RouteLocationNormalized, "meta" | "fullPath">;

export async function resolveRouteAccess(to: RequestedRoute) {
  if (to.meta.isPublic) {
    return true;
  }

  const currentUser = await fetchCurrentUser();
  const signedInAsAdministrator = isAdministrator(currentUser);
  const attendeeOrOrganizer = signedInAsAdministrator ? null : currentUser;

  if (to.meta.isGuestOnly) {
    return attendeeOrOrganizer ? { name: "landing" } : true;
  }

  if (!attendeeOrOrganizer) {
    return {
      name: "login",
      query: {
        redirectTo: to.fullPath,
        ...(signedInAsAdministrator && { rejected: "administrator" }),
      },
    };
  }

  if (to.meta.requiresOrganizer && attendeeOrOrganizer.role !== "ORGANIZER") {
    return { name: "landing" };
  }

  if (to.meta.isOrganizerOnboarding && attendeeOrOrganizer.role === "ORGANIZER") {
    return { name: "organizerEvents" };
  }

  return true;
}
