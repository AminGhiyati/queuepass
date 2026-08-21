import { createAuthClient } from "better-auth/vue";
import { apiUrl } from "./apiUrl";

export const authClient = createAuthClient({ baseURL: apiUrl });

export const { useSession, signIn, signUp, signOut } = authClient;
