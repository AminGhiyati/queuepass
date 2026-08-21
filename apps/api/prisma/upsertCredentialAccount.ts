import { auth } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";
import type { UserRole } from "../src/generated/prisma/client.js";

const CREDENTIAL_PROVIDER_ID = "credential";

export type CredentialAccount = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export async function upsertCredentialAccount({ name, email, password, role }: CredentialAccount) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { name, email, role, emailVerified: true },
  });

  const authContext = await auth.$context;
  const hashedPassword = await authContext.password.hash(password);

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: CREDENTIAL_PROVIDER_ID,
        accountId: user.id,
      },
    },
    update: { password: hashedPassword },
    create: {
      providerId: CREDENTIAL_PROVIDER_ID,
      accountId: user.id,
      userId: user.id,
      password: hashedPassword,
    },
  });

  return user;
}
