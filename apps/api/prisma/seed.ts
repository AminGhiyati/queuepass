import { environment } from "../src/lib/environment.js";
import { prisma } from "../src/lib/prisma.js";
import { upsertCredentialAccount, type CredentialAccount } from "./upsertCredentialAccount.js";
import type { EventStatus } from "../src/generated/prisma/client.js";

type SeededEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  capacity: number;
  status: EventStatus;
};

async function seedAccount(account: CredentialAccount) {
  const user = await upsertCredentialAccount(account);

  console.log(`Seeded ${account.role.toLowerCase()} ${account.email}`);

  return user;
}

function upcomingDate(daysFromNow: number, hourOfDay: number) {
  const date = new Date();

  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hourOfDay, 0, 0, 0);

  return date;
}

const demoOrganizerAccount: CredentialAccount = {
  name: "Demo Organizer",
  email: "organizer@example.com",
  password: "organizer12345",
  role: "ORGANIZER",
};

const demoEvents: SeededEvent[] = [
  {
    id: "demo-event-harbour-nights",
    title: "Harbour Nights Open Air",
    description:
      "Three stages between the cranes, house and disco until sunrise, food trucks along the pier.",
    location: "Hafenpark, Hamburg",
    startsAt: upcomingDate(21, 18),
    endsAt: upcomingDate(22, 4),
    priceCents: 3900,
    capacity: 800,
    status: "PUBLISHED",
  },
  {
    id: "demo-event-city-marathon",
    title: "City Marathon Warm-Up Run",
    description:
      "A relaxed ten kilometre run through the old town, pacemakers for every finishing time, breakfast at the finish line.",
    location: "Marktplatz, Leipzig",
    startsAt: upcomingDate(35, 9),
    endsAt: upcomingDate(35, 13),
    priceCents: 0,
    capacity: 300,
    status: "PUBLISHED",
  },
  {
    id: "demo-event-founders-dinner",
    title: "Founders Dinner",
    description:
      "Four courses, six founders on stage, one long table. Seats are limited and assigned on arrival.",
    location: "Alte Münze, Berlin",
    startsAt: upcomingDate(49, 19),
    endsAt: upcomingDate(49, 23),
    priceCents: 8500,
    capacity: 60,
    status: "DRAFT",
  },
];

async function seedEvent(organizerId: string, { id, ...details }: SeededEvent) {
  await prisma.event.upsert({
    where: { id },
    update: { ...details, organizerId },
    create: { id, ...details, organizerId },
  });

  console.log(`Seeded event ${details.title}`);
}

const DEFAULT_PLATFORM_FEE_PERCENT = 5;

await seedAccount({
  name: "Administrator",
  email: environment.ADMIN_EMAIL,
  password: environment.ADMIN_PASSWORD,
  role: "ADMIN",
});

const demoOrganizer = await seedAccount(demoOrganizerAccount);

for (const demoEvent of demoEvents) {
  await seedEvent(demoOrganizer.id, demoEvent);
}

await prisma.platformSettings.upsert({
  where: { id: "singleton" },
  update: { feePercent: DEFAULT_PLATFORM_FEE_PERCENT },
  create: { id: "singleton", feePercent: DEFAULT_PLATFORM_FEE_PERCENT },
});

console.log(`Platform fee set to ${DEFAULT_PLATFORM_FEE_PERCENT}%`);

await prisma.$disconnect();
