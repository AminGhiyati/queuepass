import type { RouteLocationNormalized } from "vue-router";
import { signOut } from "@/lib/authClient";
import { fetchSignedInUser, isAdministrator } from "@/lib/currentAdmin";

type RequestedRoute = Pick<RouteLocationNormalized, "name">;

export async function resolveRouteAccess(to: RequestedRoute) {
  const signedInUser = await fetchSignedInUser();
  const isLoginRoute = to.name === "login";

  if (isAdministrator(signedInUser)) {
    return isLoginRoute ? { name: "revenue" } : true;
  }

  if (signedInUser) {
    await signOut();

    return isLoginRoute ? true : { name: "login", query: { rejected: "notAnAdmin" } };
  }

  return isLoginRoute ? true : { name: "login" };
}
