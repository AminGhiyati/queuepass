import { environment } from "../src/lib/environment.js";
import { prisma } from "../src/lib/prisma.js";
import { upsertCredentialAccount } from "./upsertCredentialAccount.js";

await upsertCredentialAccount({
  name: "Administrator",
  email: environment.ADMIN_EMAIL,
  password: environment.ADMIN_PASSWORD,
  role: "ADMIN",
});

console.log(`Ensured admin ${environment.ADMIN_EMAIL}`);

await prisma.$disconnect();
