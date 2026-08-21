<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatEvent";

const props = defineProps<{
  event: {
    id: string;
    title: string;
    location: string;
    startsAt: Date;
    status: "DRAFT" | "PUBLISHED" | "CANCELLED";
    hasEnded: boolean;
    soldCount: number;
    capacity: number;
  };
}>();

const { t, locale } = useI18n();

const displayedStatus = computed(() => {
  if (props.event.status === "CANCELLED") return "CANCELLED";

  return props.event.hasEnded ? "ENDED" : props.event.status;
});
</script>

<template>
  <Card data-testid="organizer-event-row">
    <CardContent class="flex flex-wrap items-center justify-between gap-4 p-5">
      <div class="min-w-48">
        <div class="flex items-center gap-3">
          <h2 data-testid="organizer-event-title" class="font-semibold">{{ event.title }}</h2>
          <span
            data-testid="organizer-event-status"
            class="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
          >
            {{ t(`organizer.status.${displayedStatus}`) }}
          </span>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ formatDateTime(event.startsAt, locale) }} · {{ event.location }}
        </p>
        <p data-testid="organizer-event-sales" class="mt-1 text-sm text-muted-foreground">
          {{ t("organizer.ticketsSold", { sold: event.soldCount, capacity: event.capacity }) }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </CardContent>
  </Card>
</template>
