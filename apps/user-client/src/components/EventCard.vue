<script setup lang="ts">
import { CalendarDays, MapPin } from "lucide-vue-next";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import EventImage from "@/components/EventImage.vue";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatPriceInCents } from "@/lib/formatEvent";

const props = defineProps<{
  event: {
    id: string;
    title: string;
    location: string;
    startsAt: Date;
    priceCents: number;
    imageUrl: string | null;
    organizerName: string;
    isSoldOut: boolean;
  };
}>();

const { t, locale } = useI18n();

const price = computed(() =>
  props.event.priceCents === 0
    ? t("event.free")
    : formatPriceInCents(props.event.priceCents, locale.value),
);
</script>

<template>
  <RouterLink :to="{ name: 'eventDetail', params: { eventId: event.id } }" class="group block">
    <Card data-testid="event-card" class="h-full overflow-hidden transition-shadow hover:shadow-md">
      <div class="aspect-video overflow-hidden bg-muted">
        <EventImage
          :image-url="event.imageUrl"
          :title="event.title"
          class="size-full transition-transform group-hover:scale-105"
        />
      </div>
      <CardContent class="flex flex-col gap-2 p-5">
        <h3 data-testid="event-title" class="font-semibold text-pretty">{{ event.title }}</h3>

        <p class="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays class="size-4 shrink-0" />
          {{ formatDateTime(event.startsAt, locale) }}
        </p>
        <p class="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin class="size-4 shrink-0" />
          {{ event.location }}
        </p>

        <div class="mt-2 flex items-center justify-between">
          <span data-testid="event-price" class="font-medium">{{ price }}</span>
          <span v-if="event.isSoldOut" class="text-sm font-medium text-destructive">
            {{ t("event.soldOut") }}
          </span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>
