<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { History } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import MyTicketRow from "@/components/MyTicketRow.vue";
import { buttonVariants } from "@/components/ui/button";
import { trpc } from "@/lib/trpcClient";

const { t } = useI18n();

const myTickets = useQuery({
  queryKey: ["myTickets", "UPCOMING"],
  queryFn: () => trpc.ticket.listMyTickets.query({ timeframe: "UPCOMING" }),
});
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-12">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">{{ t("myTickets.title") }}</h1>
        <p class="mt-2 text-muted-foreground">{{ t("myTickets.description") }}</p>
      </div>
      <RouterLink
        data-testid="past-tickets-link"
        :to="{ name: 'pastTickets' }"
        :class="buttonVariants({ variant: 'outline' })"
      >
        <History class="size-4" />
        {{ t("myTickets.pastTickets") }}
      </RouterLink>
    </div>

    <p v-if="myTickets.isError.value" class="mt-12 text-center text-destructive">
      {{ t("myTickets.loadFailed") }}
    </p>

    <div v-else-if="myTickets.data.value?.length" class="mt-8 flex flex-col gap-4">
      <MyTicketRow v-for="ticket in myTickets.data.value" :key="ticket.id" :ticket="ticket" />
    </div>

    <p
      v-else-if="!myTickets.isPending.value"
      data-testid="my-tickets-empty"
      class="mt-12 text-center text-muted-foreground"
    >
      {{ t("myTickets.empty") }}
    </p>
  </main>
</template>
