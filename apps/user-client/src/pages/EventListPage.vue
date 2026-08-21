<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import EventCard from "@/components/EventCard.vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpcClient";

const { t } = useI18n();

const search = ref("");

const publishedEvents = useQuery({
  queryKey: ["publishedEvents", search],
  queryFn: () => trpc.event.listPublishedEvents.query({ search: search.value }),
});

const emptyMessage = computed(() => (search.value ? t("events.noMatch") : t("events.empty")));
</script>

<template>
  <main class="mx-auto max-w-5xl px-6 py-12">
    <h1 class="text-3xl font-semibold tracking-tight">{{ t("events.title") }}</h1>
    <p class="mt-2 text-muted-foreground">{{ t("events.subtitle") }}</p>

    <div class="mt-8 flex max-w-sm flex-col gap-2">
      <Label for="search">{{ t("events.searchLabel") }}</Label>
      <Input id="search" v-model="search" :placeholder="t('events.searchPlaceholder')" />
    </div>

    <p v-if="publishedEvents.isError.value" class="mt-12 text-center text-destructive">
      {{ t("events.loadFailed") }}
    </p>

    <div
      v-else-if="publishedEvents.data.value?.length"
      class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <EventCard v-for="event in publishedEvents.data.value" :key="event.id" :event="event" />
    </div>

    <p
      v-else-if="!publishedEvents.isPending.value"
      data-testid="events-empty"
      class="mt-12 text-center text-muted-foreground"
    >
      {{ emptyMessage }}
    </p>
  </main>
</template>
