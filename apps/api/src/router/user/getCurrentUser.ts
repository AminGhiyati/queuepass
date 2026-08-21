import { authenticatedProcedure } from "../../trpc/procedures.js";

export const getCurrentUser = authenticatedProcedure.query(({ ctx }) => ctx.currentUser);
