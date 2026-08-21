<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { ArrowLeft } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entranceClosureOf } from "@/lib/eventEntrance";
import { trpc } from "@/lib/trpcClient";

const { t } = useI18n();
const route = useRoute();
const queryClient = useQueryClient();

const eventId = computed(() => String(route.params.eventId));
const search = ref("");
const actionFailed = ref(false);

const event = useQuery({
  queryKey: ["myEvent", eventId],
  queryFn: () => trpc.event.getMyEvent.query({ eventId: eventId.value }),
});

const entranceClosure = computed(() => entranceClosureOf(event.data.value));

const attendeesQueryKey = computed(() => ["eventTickets", eventId.value]);

const attendees = useQuery({
  queryKey: attendeesQueryKey,
  queryFn: () => trpc.ticket.listEventTickets.query({ eventId: eventId.value }),
});

const matchingAttendees = computed(() => {
  const term = search.value.trim().toLowerCase();
  const sold = attendees.data.value ?? [];

  if (!term) {
    return sold;
  }

  return sold.filter((ticket) =>
    [ticket.buyerName, ticket.buyerEmail, ticket.code].some((value) =>
      value.toLowerCase().includes(term),
    ),
  );
});

const checkedInCount = computed(
  () => attendees.data.value?.filter((ticket) => ticket.isCheckedIn).length ?? 0,
);

function attendeeMutation<Input>(run: (input: Input) => Promise<unknown>) {
  return useMutation({
    mutationFn: run,
    onMutate: () => {
      actionFailed.value = false;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendeesQueryKey.value }),
    onError: () => {
      actionFailed.value = true;
    },
  });
}

const checkInTicket = attendeeMutation((code: string) =>
  trpc.checkIn.checkInTicket.mutate({ eventId: eventId.value, code }),
);

const undoCheckIn = attendeeMutation((ticketId: string) =>
  trpc.checkIn.undoTicketCheckIn.mutate({ eventId: eventId.value, ticketId }),
);
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-12">
    <RouterLink
      :to="{ name: 'organizerEvents' }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      {{ t("attendees.back") }}
    </RouterLink>

    <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t("attendees.title") }}</h1>
        <p class="mt-2 text-muted-foreground">
          {{ t("attendees.description", { event: event.data.value?.title ?? "" }) }}
        </p>
      </div>
      <RouterLink
        v-if="!entranceClosure"
        :to="{ name: 'eventScanner', params: { eventId } }"
        :class="buttonVariants({ variant: 'outline', size: 'sm' })"
      >
        {{ t("attendees.toScanner") }}
      </RouterLink>
    </div>

    <p
      v-if="entranceClosure"
      data-testid="attendees-entrance-closed"
      class="mt-6 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground"
    >
      {{ t(`attendees.entranceClosed.${entranceClosure}`) }}
    </p>

    <p v-if="actionFailed" data-testid="attendees-error" class="mt-4 text-sm text-destructive">
      {{ t("attendees.actionFailed") }}
    </p>

    <p v-if="attendees.isError.value" class="mt-12 text-center text-destructive">
      {{ t("attendees.loadFailed") }}
    </p>

    <template v-else-if="attendees.data.value?.length">
      <p data-testid="attendees-summary" class="mt-8 text-sm text-muted-foreground">
        {{
          t("attendees.summary", {
            checkedIn: checkedInCount,
            total: attendees.data.value.length,
          })
        }}
      </p>

      <div class="mt-4 flex max-w-sm flex-col gap-2">
        <Label for="attendee-search">{{ t("attendees.searchLabel") }}</Label>
        <Input
          id="attendee-search"
          v-model="search"
          :placeholder="t('attendees.searchPlaceholder')"
        />
      </div>

      <table class="mt-6 w-full text-left text-sm">
        <thead class="border-b text-muted-foreground">
          <tr>
            <th class="py-2 font-medium">{{ t("attendees.buyer") }}</th>
            <th class="py-2 font-medium">{{ t("attendees.code") }}</th>
            <th class="py-2 font-medium">{{ t("attendees.status") }}</th>
            <th v-if="!entranceClosure" class="py-2" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in matchingAttendees"
            :key="ticket.id"
            data-testid="attendee-row"
            class="border-b last:border-0"
          >
            <td class="py-3">
              <p data-testid="attendee-name">{{ ticket.buyerName }}</p>
              <p class="text-xs text-muted-foreground">{{ ticket.buyerEmail }}</p>
            </td>
            <td class="py-3 font-mono text-xs break-all">{{ ticket.code }}</td>
            <td data-testid="attendee-status" class="py-3">
              {{ ticket.isCheckedIn ? t("attendees.checkedIn") : t("attendees.notCheckedIn") }}
            </td>
            <td v-if="!entranceClosure" class="py-3 text-right">
              <Button
                v-if="ticket.isCheckedIn"
                data-testid="undo-check-in"
                variant="ghost"
                size="sm"
                :disabled="undoCheckIn.isPending.value"
                @click="undoCheckIn.mutate(ticket.id)"
              >
                {{ t("attendees.undoCheckIn") }}
              </Button>
              <Button
                v-else
                data-testid="check-in-attendee"
                variant="outline"
                size="sm"
                :disabled="checkInTicket.isPending.value"
                @click="checkInTicket.mutate(ticket.code)"
              >
                {{ t("attendees.checkIn") }}
              </Button>
            </td>
          </tr>
        </tbody>
      </table>

      <p
        v-if="!matchingAttendees.length"
        data-testid="attendees-no-match"
        class="mt-8 text-center text-muted-foreground"
      >
        {{ t("attendees.noMatch") }}
      </p>
    </template>

    <p
      v-else-if="!attendees.isPending.value"
      data-testid="attendees-empty"
      class="mt-12 text-center text-muted-foreground"
    >
      {{ t("attendees.empty") }}
    </p>
  </main>
</template>
