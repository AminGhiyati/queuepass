<script setup lang="ts">
import { CalendarDays, MapPin } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatEvent";

defineProps<{
  ticket: {
    id: string;
    isCheckedIn: boolean;
    isValid: boolean;
    event: { title: string; location: string; startsAt: Date };
  };
}>();

const { t, locale } = useI18n();
</script>

<template>
  <Card data-testid="ticket-row">
    <CardContent class="flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div class="flex items-center gap-3">
          <h2 data-testid="ticket-event-title" class="font-semibold">
            {{ ticket.event.title }}
          </h2>
          <span
            v-if="!ticket.isValid"
            data-testid="ticket-cancelled"
            class="rounded-full border border-destructive/40 px-2 py-0.5 text-xs text-destructive"
          >
            {{ t("myTickets.cancelled") }}
          </span>
        </div>
        <p class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays class="size-4 shrink-0" />
          {{ formatDateTime(ticket.event.startsAt, locale) }}
        </p>
        <p class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin class="size-4 shrink-0" />
          {{ ticket.event.location }}
        </p>
        <p
          v-if="ticket.isCheckedIn"
          data-testid="ticket-checked-in"
          class="mt-1 text-sm text-muted-foreground"
        >
          {{ t("myTickets.checkedIn") }}
        </p>
      </div>

      <RouterLink
        :to="{ name: 'ticketDetail', params: { ticketId: ticket.id } }"
        :class="buttonVariants({ variant: 'outline', size: 'sm' })"
      >
        {{ t("myTickets.showTicket") }}
      </RouterLink>
    </CardContent>
  </Card>
</template>
