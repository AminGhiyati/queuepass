<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { CalendarPlus, Check, Ticket } from "lucide-vue-next";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import EventCard from "@/components/EventCard.vue";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpcClient";
import { useCurrentUser } from "@/lib/useCurrentUser";

const HIGHLIGHTED_EVENT_COUNT = 6;

const { t } = useI18n();

const highlightedEvents = useQuery({
  queryKey: ["publishedEvents", "highlighted"],
  queryFn: () => trpc.event.listPublishedEvents.query({ limit: HIGHLIGHTED_EVENT_COUNT }),
});

const organizerBenefits = ["publishFast", "soldOutSafely", "scanAnywhere"] as const;
const attendeeBenefits = ["buyInSeconds", "ticketInWallet", "printIfYouLike"] as const;

const { isAttendee, isOrganizer } = useCurrentUser();

const organizerCallToAction = computed(() => {
  if (isOrganizer.value) {
    return { name: "organizerEvents" };
  }
  if (isAttendee.value) {
    return { name: "becomeOrganizer" };
  }
  return { name: "register", query: { role: "organizer" } };
});
</script>

<template>
  <main>
    <section class="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
      <p class="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        {{ t("landing.tagline") }}
      </p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {{ t("landing.headline") }}
      </h1>
      <p class="mx-auto mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
        {{ t("landing.subline") }}
      </p>
      <div class="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <RouterLink :to="{ name: 'events' }" :class="buttonVariants({ size: 'lg' })">
          {{ t("landing.discoverEvents") }}
        </RouterLink>
        <RouterLink
          :to="organizerCallToAction"
          :class="buttonVariants({ size: 'lg', variant: 'outline' })"
        >
          {{ t("landing.hostEvent") }}
        </RouterLink>
      </div>
    </section>

    <section class="mx-auto grid max-w-5xl gap-6 px-6 pb-20 md:grid-cols-2">
      <Card>
        <CardHeader class="flex-row items-center gap-3">
          <CalendarPlus class="size-5 text-muted-foreground" />
          <CardTitle>{{ t("landing.forOrganizers.title") }}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="flex flex-col gap-3">
            <li v-for="benefit in organizerBenefits" :key="benefit" class="flex gap-3">
              <Check class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span class="text-sm text-pretty">{{ t(`landing.forOrganizers.${benefit}`) }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex-row items-center gap-3">
          <Ticket class="size-5 text-muted-foreground" />
          <CardTitle>{{ t("landing.forAttendees.title") }}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="flex flex-col gap-3">
            <li v-for="benefit in attendeeBenefits" :key="benefit" class="flex gap-3">
              <Check class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span class="text-sm text-pretty">{{ t(`landing.forAttendees.${benefit}`) }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>

    <section
      v-if="highlightedEvents.data.value?.length"
      class="mx-auto max-w-5xl px-6 pb-20"
      data-testid="highlighted-events"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h2 class="text-2xl font-semibold tracking-tight">{{ t("landing.upcoming.title") }}</h2>
        <RouterLink
          :to="{ name: 'events' }"
          class="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {{ t("landing.upcoming.showAll") }}
        </RouterLink>
      </div>

      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <EventCard
          v-for="event in highlightedEvents.data.value"
          :key="event.id"
          :event="event"
        />
      </div>
    </section>

    <section class="border-t bg-muted/40">
      <div class="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 class="text-2xl font-semibold tracking-tight">{{ t("landing.closing.title") }}</h2>
        <p class="mx-auto mt-3 max-w-lg text-muted-foreground text-pretty">
          {{ t("landing.closing.description") }}
        </p>
        <RouterLink
          :to="organizerCallToAction"
          :class="buttonVariants({ size: 'lg', class: 'mt-8' })"
        >
          {{ t("landing.closing.action") }}
        </RouterLink>
      </div>
    </section>
  </main>
</template>
