<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { ArrowLeft } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import MyTicketRow from "@/components/MyTicketRow.vue";
import { trpc } from "@/lib/trpcClient";

const { t } = useI18n();

const pastTickets = useQuery({
  queryKey: ["myTickets", "PAST"],
  queryFn: () => trpc.ticket.listMyTickets.query({ timeframe: "PAST" }),
});
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-12">
    <RouterLink
      :to="{ name: 'myTickets' }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      {{ t("pastTickets.back") }}
    </RouterLink>

    <h1 class="mt-6 text-3xl font-semibold tracking-tight">{{ t("pastTickets.title") }}</h1>
    <p class="mt-2 text-muted-foreground">{{ t("pastTickets.description") }}</p>

    <p v-if="pastTickets.isError.value" class="mt-12 text-center text-destructive">
      {{ t("pastTickets.loadFailed") }}
    </p>

    <div v-else-if="pastTickets.data.value?.length" class="mt-8 flex flex-col gap-4">
      <MyTicketRow v-for="ticket in pastTickets.data.value" :key="ticket.id" :ticket="ticket" />
    </div>

    <p
      v-else-if="!pastTickets.isPending.value"
      data-testid="past-tickets-empty"
      class="mt-12 text-center text-muted-foreground"
    >
      {{ t("pastTickets.empty") }}
    </p>
  </main>
</template>
