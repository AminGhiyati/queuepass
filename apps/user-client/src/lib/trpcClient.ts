import type { AppRouter } from "api/router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { apiUrl } from "./apiUrl";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiUrl}/trpc`,
      transformer: superjson,
      fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
    }),
  ],
});
