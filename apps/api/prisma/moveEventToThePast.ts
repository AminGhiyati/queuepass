import { prisma } from "../src/lib/prisma.js";

const [title] = process.argv.slice(2);

if (!title) {
  throw new Error("Pass the title of the event that should lie in the past.");
}

const { count } = await prisma.event.updateMany({
  where: { title },
  data: {
    startsAt: new Date("2020-09-01T18:00:00.000Z"),
    endsAt: new Date("2020-09-02T02:00:00.000Z"),
  },
});

console.log(`Moved ${count} event(s) titled "${title}" into the past`);

await prisma.$disconnect();
