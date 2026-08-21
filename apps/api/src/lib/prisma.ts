import { PrismaPg } from "@prisma/adapter-pg";
import { environment } from "./environment.js";
import { PrismaClient } from "../generated/prisma/client.js";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: environment.DATABASE_URL }),
});
