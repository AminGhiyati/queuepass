import { authClient } from "./authClient";
import { trpc } from "./trpcClient";

export type SignedInUser = Awaited<ReturnType<typeof trpc.user.getCurrentUser.query>>;

export async function fetchSignedInUser() {
  const { data: session } = await authClient.getSession();

  if (!session) {
    return null;
  }

  return trpc.user.getCurrentUser.query();
}

export function isAdministrator(user: Pick<SignedInUser, "role"> | null | undefined) {
  return user?.role === "ADMIN";
}

export async function fetchCurrentAdmin() {
  const signedInUser = await fetchSignedInUser();

  return isAdministrator(signedInUser) ? signedInUser : null;
}
