import { authClient } from "./authClient";
import { trpc } from "./trpcClient";

export type CurrentUser = Awaited<ReturnType<typeof trpc.user.getCurrentUser.query>>;

export async function fetchCurrentUser() {
  const { data: session } = await authClient.getSession();

  if (!session) {
    return null;
  }

  return trpc.user.getCurrentUser.query();
}

export function isAdministrator(user: Pick<CurrentUser, "role"> | null | undefined) {
  return user?.role === "ADMIN";
}
