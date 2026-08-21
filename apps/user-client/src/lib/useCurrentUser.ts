import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useSession } from "./authClient";
import { trpc } from "./trpcClient";

export function useCurrentUser() {
  const session = useSession();
  const hasSession = computed(() => Boolean(session.value?.data));

  const currentUser = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => trpc.user.getCurrentUser.query(),
    enabled: hasSession,
  });

  const signedInRole = computed(() => (hasSession.value ? currentUser.data.value?.role : undefined));

  return {
    hasSession,
    currentUser,
    isSignedIn: computed(() => signedInRole.value !== undefined && signedInRole.value !== "ADMIN"),
    signedInAsAdministrator: computed(() => signedInRole.value === "ADMIN"),
    isAttendee: computed(() => signedInRole.value === "ATTENDEE"),
    isOrganizer: computed(() => signedInRole.value === "ORGANIZER"),
  };
}
