<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatPriceInCents } from "@/lib/formatMoney";
import { trpc } from "@/lib/trpcClient";

const { t, locale } = useI18n();

const search = ref("");

const events = useQuery({
  queryKey: ["allEvents"],
  queryFn: () => trpc.platform.listAllEvents.query(),
});

const matchingEvents = computed(() => {
  const term = search.value.trim().toLowerCase();
  const all = events.data.value ?? [];

  if (!term) {
    return all;
  }

  return all.filter((event) =>
    [event.title, event.location, event.organizerName, event.organizerEmail].some((value) =>
      value.toLowerCase().includes(term),
    ),
  );
});

function priceLabel(priceCents: number) {
  return priceCents === 0 ? t("events.free") : formatPriceInCents(priceCents, locale.value);
}
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t("events.title") }}</h1>
      <p class="mt-2 text-muted-foreground text-pretty">{{ t("events.description") }}</p>
    </div>

    <div class="flex max-w-sm flex-col gap-2">
      <Label for="event-search">{{ t("events.searchLabel") }}</Label>
      <Input id="event-search" v-model="search" :placeholder="t('events.searchPlaceholder')" />
    </div>

    <p v-if="events.isError.value" class="text-destructive">{{ t("events.loadFailed") }}</p>

    <p
      v-else-if="!events.data.value?.length && !events.isPending.value"
      data-testid="platform-events-empty"
      class="text-center text-muted-foreground"
    >
      {{ t("events.empty") }}
    </p>

    <template v-else-if="events.data.value?.length">
      <Table v-if="matchingEvents.length" class="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>{{ t("events.event") }}</TableHead>
            <TableHead>{{ t("events.organizer") }}</TableHead>
            <TableHead>{{ t("events.starts") }}</TableHead>
            <TableHead>{{ t("events.price") }}</TableHead>
            <TableHead>{{ t("events.sold") }}</TableHead>
            <TableHead>{{ t("events.status") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="event in matchingEvents" :key="event.id" data-testid="platform-event-row">
            <TableCell>
              <p data-testid="platform-event-title">{{ event.title }}</p>
              <p class="text-xs text-muted-foreground">{{ event.location }}</p>
            </TableCell>
            <TableCell>
              <p>{{ event.organizerName }}</p>
              <p class="text-xs text-muted-foreground">{{ event.organizerEmail }}</p>
            </TableCell>
            <TableCell>{{ formatDateTime(event.startsAt, locale) }}</TableCell>
            <TableCell class="tabular-nums">{{ priceLabel(event.priceCents) }}</TableCell>
            <TableCell class="tabular-nums">{{ event.soldCount }} / {{ event.capacity }}</TableCell>
            <TableCell data-testid="platform-event-status">
              {{ t(`events.statusLabel.${event.status}`) }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <p v-else data-testid="platform-events-no-match" class="text-center text-muted-foreground">
        {{ t("events.noMatch") }}
      </p>
    </template>
  </main>
</template>
