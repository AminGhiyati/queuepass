<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { ArrowLeft } from "lucide-vue-next";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import EventImage from "@/components/EventImage.vue";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatPriceInCents } from "@/lib/formatEvent";
import { trpc } from "@/lib/trpcClient";

const { t, locale } = useI18n();
const route = useRoute();

const eventId = computed(() => String(route.params.eventId));

const publishedEvent = useQuery({
  queryKey: ["publishedEvent", eventId],
  queryFn: () => trpc.event.getPublishedEvent.query({ eventId: eventId.value }),
  retry: false,
});

const event = computed(() => publishedEvent.data.value);

const price = computed(() => {
  if (!event.value) {
    return "";
  }
  return event.value.priceCents === 0
    ? t("event.free")
    : formatPriceInCents(event.value.priceCents, locale.value);
});

const isOnSale = computed(
  () =>
    event.value?.status === "PUBLISHED" && !event.value.isSoldOut && !event.value.hasEnded,
);

const unavailableReason = computed(() => {
  if (event.value?.hasEnded) {
    return t("eventDetail.overNotice");
  }
  if (event.value?.isSoldOut) {
    return t("event.soldOut");
  }
  return t("eventDetail.cancelledNotice");
});
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-10">
    <RouterLink
      :to="{ name: 'events' }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      {{ t("eventDetail.backToEvents") }}
    </RouterLink>

    <p v-if="publishedEvent.isError.value" class="mt-12 text-center text-muted-foreground">
      {{ t("eventDetail.notFound") }}
    </p>

    <article v-else-if="event" class="mt-6">
      <EventImage
        :image-url="event.imageUrl"
        :title="event.title"
        class="aspect-video w-full rounded-lg"
      />

      <h1 data-testid="event-title" class="mt-8 text-3xl font-semibold tracking-tight text-balance">
        {{ event.title }}
      </h1>
      <p class="mt-2 text-muted-foreground">
        {{ t("event.by", { organizer: event.organizerName }) }}
      </p>

      <p
        v-if="event.status === 'CANCELLED'"
        data-testid="event-cancelled"
        class="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {{ t("eventDetail.cancelledNotice") }}
      </p>

      <p class="mt-6 whitespace-pre-line text-pretty">{{ event.description }}</p>

      <Card class="mt-8">
        <CardContent class="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <p class="text-sm text-muted-foreground">{{ t("eventDetail.when") }}</p>
            <p class="font-medium">{{ formatDateTime(event.startsAt, locale) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t("eventDetail.where") }}</p>
            <p class="font-medium">{{ event.location }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t("eventDetail.price") }}</p>
            <p data-testid="event-price" class="font-medium">{{ price }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t("eventDetail.availability") }}</p>
            <p v-if="event.isSoldOut" data-testid="event-availability" class="font-medium text-destructive">
              {{ t("event.soldOut") }}
            </p>
            <p v-else data-testid="event-availability" class="font-medium">
              {{ t("event.ticketsLeft", { count: event.availableCount, capacity: event.capacity }) }}
            </p>
          </div>
        </CardContent>
      </Card>

      <div class="mt-8">
        <RouterLink
          v-if="isOnSale"
          data-testid="buy-ticket"
          :to="{ name: 'checkout', params: { eventId } }"
          :class="buttonVariants({ size: 'lg' })"
        >
          {{ t("eventDetail.buy") }}
        </RouterLink>
        <p v-else data-testid="buy-unavailable" class="text-sm text-muted-foreground">
          {{ unavailableReason }}
        </p>
      </div>
    </article>
  </main>
</template>
