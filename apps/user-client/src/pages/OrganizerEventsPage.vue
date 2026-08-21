<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { History, Plus } from "lucide-vue-next";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import OrganizerEventRow from "@/components/OrganizerEventRow.vue";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatPriceInCents } from "@/lib/formatEvent";
import { trpc } from "@/lib/trpcClient";

type CancellationSummary = {
  refundedOrderCount: number;
  failedRefundCount: number;
  refundedCents: number;
};

const { t, locale } = useI18n();
const queryClient = useQueryClient();

const myEventsQueryKey = ["myEvents"];
const actionFailed = ref(false);
const eventPendingCancellation = ref<string | null>(null);
const cancellation = ref<CancellationSummary | null>(null);

const myEvents = useQuery({
  queryKey: [...myEventsQueryKey, "UPCOMING"],
  queryFn: () => trpc.event.listMyEvents.query({ timeframe: "UPCOMING" }),
});

function eventMutation<Result>(run: (eventId: string) => Promise<Result>) {
  return useMutation({
    mutationFn: run,
    onMutate: () => {
      actionFailed.value = false;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myEventsQueryKey }),
    onError: () => {
      actionFailed.value = true;
    },
  });
}

const publishEvent = eventMutation((eventId) => trpc.event.publishEvent.mutate({ eventId }));
const deleteEvent = eventMutation((eventId) => trpc.event.deleteEvent.mutate({ eventId }));

const cancelEvent = useMutation({
  mutationFn: (eventId: string) => trpc.event.cancelEvent.mutate({ eventId }),
  onMutate: () => {
    actionFailed.value = false;
    cancellation.value = null;
  },
  onSuccess: (summary) => {
    cancellation.value = summary;
    eventPendingCancellation.value = null;
    queryClient.invalidateQueries({ queryKey: myEventsQueryKey });
  },
  onError: () => {
    actionFailed.value = true;
  },
});

function cancelWarningOf(event: { soldCount: number; capacity: number; priceCents: number }) {
  return t("organizer.cancelWarning", {
    sold: event.soldCount,
    capacity: event.capacity,
    amount: formatPriceInCents(event.soldCount * event.priceCents, locale.value),
  });
}
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-12">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t("organizer.title") }}</h1>
        <p class="mt-2 text-muted-foreground">{{ t("organizer.description") }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <RouterLink
          data-testid="past-events-link"
          :to="{ name: 'pastEvents' }"
          :class="buttonVariants({ variant: 'outline' })"
        >
          <History class="size-4" />
          {{ t("organizer.pastEvents") }}
        </RouterLink>
        <RouterLink :to="{ name: 'eventCreate' }" :class="buttonVariants()">
          <Plus class="size-4" />
          {{ t("organizer.newEvent") }}
        </RouterLink>
      </div>
    </div>

    <p v-if="actionFailed" class="mt-6 text-sm text-destructive">
      {{ t("organizer.actionFailed") }}
    </p>

    <p
      v-if="cancellation?.refundedOrderCount"
      data-testid="cancel-event-summary"
      class="mt-6 text-sm text-muted-foreground"
    >
      {{
        t("organizer.cancelDone", {
          count: cancellation.refundedOrderCount,
          amount: formatPriceInCents(cancellation.refundedCents, locale),
        })
      }}
    </p>

    <p
      v-if="cancellation?.failedRefundCount"
      data-testid="cancel-refund-failed"
      class="mt-2 text-sm text-destructive"
    >
      {{ t("organizer.cancelRefundFailed", { count: cancellation.failedRefundCount }) }}
    </p>

    <p v-if="myEvents.isError.value" class="mt-12 text-center text-destructive">
      {{ t("organizer.loadFailed") }}
    </p>

    <div v-else-if="myEvents.data.value?.length" class="mt-8 flex flex-col gap-4">
      <OrganizerEventRow v-for="event in myEvents.data.value" :key="event.id" :event="event">
        <template #actions>
          <RouterLink
            v-if="event.status === 'PUBLISHED' && !event.hasEnded"
            :to="{ name: 'eventScanner', params: { eventId: event.id } }"
            :class="buttonVariants({ size: 'sm' })"
          >
            {{ t("organizer.scan") }}
          </RouterLink>

          <RouterLink
            :to="{ name: 'eventAttendees', params: { eventId: event.id } }"
            :class="buttonVariants({ variant: 'outline', size: 'sm' })"
          >
            {{ t("organizer.attendees") }}
          </RouterLink>

          <RouterLink
            :to="{ name: 'eventEdit', params: { eventId: event.id } }"
            :class="buttonVariants({ variant: 'outline', size: 'sm' })"
          >
            {{ t("organizer.edit") }}
          </RouterLink>

          <Button
            v-if="event.status === 'DRAFT'"
            data-testid="publish-event"
            size="sm"
            :disabled="publishEvent.isPending.value"
            @click="publishEvent.mutate(event.id)"
          >
            {{ t("organizer.publish") }}
          </Button>

          <template v-if="eventPendingCancellation === event.id">
            <p data-testid="cancel-event-warning" class="basis-full text-sm text-destructive">
              {{ cancelWarningOf(event) }}
            </p>
            <Button
              data-testid="confirm-cancel-event"
              variant="destructive"
              size="sm"
              :disabled="cancelEvent.isPending.value"
              @click="cancelEvent.mutate(event.id)"
            >
              {{ t("organizer.confirmCancel") }}
            </Button>
            <Button variant="ghost" size="sm" @click="eventPendingCancellation = null">
              {{ t("organizer.keepEvent") }}
            </Button>
          </template>

          <Button
            v-else-if="event.status === 'PUBLISHED'"
            data-testid="cancel-event"
            variant="outline"
            size="sm"
            @click="eventPendingCancellation = event.id"
          >
            {{ t("organizer.cancelEvent") }}
          </Button>

          <Button
            v-if="event.status === 'DRAFT'"
            data-testid="delete-event"
            variant="ghost"
            size="sm"
            :disabled="deleteEvent.isPending.value"
            @click="deleteEvent.mutate(event.id)"
          >
            {{ t("organizer.deleteEvent") }}
          </Button>
        </template>
      </OrganizerEventRow>
    </div>

    <p
      v-else-if="!myEvents.isPending.value"
      data-testid="organizer-events-empty"
      class="mt-12 text-center text-muted-foreground"
    >
      {{ t("organizer.empty") }}
    </p>
  </main>
</template>
