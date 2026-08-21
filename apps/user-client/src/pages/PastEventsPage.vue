<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { ArrowLeft } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import OrganizerEventRow from "@/components/OrganizerEventRow.vue";
import { buttonVariants } from "@/components/ui/button";
import { trpc } from "@/lib/trpcClient";

const { t } = useI18n();

const pastEvents = useQuery({
  queryKey: ["myEvents", "PAST"],
  queryFn: () => trpc.event.listMyEvents.query({ timeframe: "PAST" }),
});
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-12">
    <RouterLink
      :to="{ name: 'organizerEvents' }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      {{ t("pastEvents.back") }}
    </RouterLink>

    <h1 class="mt-6 text-3xl font-semibold tracking-tight">{{ t("pastEvents.title") }}</h1>
    <p class="mt-2 text-muted-foreground">{{ t("pastEvents.description") }}</p>

    <p v-if="pastEvents.isError.value" class="mt-12 text-center text-destructive">
      {{ t("pastEvents.loadFailed") }}
    </p>

    <div v-else-if="pastEvents.data.value?.length" class="mt-8 flex flex-col gap-4">
      <OrganizerEventRow v-for="event in pastEvents.data.value" :key="event.id" :event="event">
        <template #actions>
          <RouterLink
            :to="{ name: 'eventAttendees', params: { eventId: event.id } }"
            :class="buttonVariants({ variant: 'outline', size: 'sm' })"
          >
            {{ t("organizer.attendees") }}
          </RouterLink>
        </template>
      </OrganizerEventRow>
    </div>

    <p
      v-else-if="!pastEvents.isPending.value"
      data-testid="past-events-empty"
      class="mt-12 text-center text-muted-foreground"
    >
      {{ t("pastEvents.empty") }}
    </p>
  </main>
</template>
