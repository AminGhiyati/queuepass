import { prisma } from "../src/lib/prisma.js";

const TEST_ACCOUNT_EMAIL_PREFIX = "e2e-";

const { count } = await prisma.user.deleteMany({
  where: { email: { startsWith: TEST_ACCOUNT_EMAIL_PREFIX } },
});

console.log(`Removed ${count} test accounts`);

await prisma.$disconnect();
