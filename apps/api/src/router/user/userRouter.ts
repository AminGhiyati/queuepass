import { createRouter } from "../../trpc/procedures.js";
import { becomeOrganizer } from "./becomeOrganizer.js";
import { getCurrentUser } from "./getCurrentUser.js";

export const userRouter = createRouter({
  getCurrentUser,
  becomeOrganizer,
});
