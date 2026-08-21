import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { stripeWebhook } from "./http/stripeWebhook.js";
import { ticketDownloads } from "./http/ticketDownloads.js";
import { auth } from "./lib/auth.js";
import { environment } from "./lib/environment.js";
import { appRouter } from "./router/appRouter.js";
import { createContext } from "./trpc/context.js";

const app = express();

app.use(
  cors({
    origin: [environment.USER_CLIENT_URL, environment.ADMIN_CLIENT_URL],
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(stripeWebhook);

app.use(express.json());

app.get("/health", (_request, response) => response.json({ status: "ok" }));

app.use(ticketDownloads);

app.use("/trpc", createExpressMiddleware({ router: appRouter, createContext }));

app.listen(environment.API_PORT, () => {
  console.log(`API listening on http://localhost:${environment.API_PORT}`);
});
