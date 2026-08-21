<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
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
const queryClient = useQueryClient();

const pendingOrganizerId = ref<string | null>(null);
const markedOrganizerId = ref<string | null>(null);
const failedOrganizerId = ref<string | null>(null);

const payouts = useQuery({
  queryKey: ["organizerPayouts"],
  queryFn: () => trpc.payout.listOrganizerPayouts.query(),
});

const markPayout = useMutation({
  mutationFn: (organizerId: string) =>
    trpc.payout.markOrganizerPayoutTransferred.mutate({ organizerId }),
  onMutate: (organizerId) => {
    pendingOrganizerId.value = organizerId;
    markedOrganizerId.value = null;
    failedOrganizerId.value = null;
  },
  onSuccess: async (_payout, organizerId) => {
    markedOrganizerId.value = organizerId;
    await queryClient.invalidateQueries({ queryKey: ["organizerPayouts"] });
  },
  onError: (_failure, organizerId) => {
    failedOrganizerId.value = organizerId;
  },
  onSettled: () => {
    pendingOrganizerId.value = null;
  },
});

function money(cents: number) {
  return formatPriceInCents(cents, locale.value);
}
</script>

<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t("payouts.title") }}</h1>
      <p class="mt-2 text-muted-foreground text-pretty">{{ t("payouts.description") }}</p>
      <p class="mt-2 text-sm text-muted-foreground text-pretty">{{ t("payouts.hint") }}</p>
    </div>

    <p v-if="payouts.isError.value" class="text-destructive">{{ t("payouts.loadFailed") }}</p>

    <p
      v-else-if="payouts.data.value && !payouts.data.value.length"
      data-testid="payouts-empty"
      class="text-center text-muted-foreground"
    >
      {{ t("payouts.empty") }}
    </p>

    <Table v-else-if="payouts.data.value?.length" class="min-w-4xl">
      <TableHeader>
        <TableRow>
          <TableHead>{{ t("payouts.organizer") }}</TableHead>
          <TableHead>{{ t("payouts.iban") }}</TableHead>
          <TableHead>{{ t("payouts.earned") }}</TableHead>
          <TableHead>{{ t("payouts.transferred") }}</TableHead>
          <TableHead>{{ t("payouts.outstanding") }}</TableHead>
          <TableHead>{{ t("payouts.lastTransfer") }}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in payouts.data.value"
          :key="row.organizerId"
          data-testid="payout-row"
        >
          <TableCell>
            <p data-testid="payout-organizer">{{ row.organizerName }}</p>
            <p class="text-xs text-muted-foreground">{{ row.organizerEmail }}</p>
          </TableCell>
          <TableCell>
            <span v-if="row.payoutIban" data-testid="payout-iban" class="text-xs tabular-nums">
              {{ row.payoutIban }}
            </span>
            <span v-else data-testid="payout-iban-missing" class="text-xs text-destructive">
              {{ t("payouts.noIban") }}
            </span>
          </TableCell>
          <TableCell data-testid="payout-earned" class="tabular-nums">
            {{ money(row.earnedCents) }}
          </TableCell>
          <TableCell data-testid="payout-transferred" class="tabular-nums">
            {{ money(row.transferredCents) }}
          </TableCell>
          <TableCell data-testid="payout-outstanding" class="tabular-nums">
            {{ money(row.outstandingCents) }}
          </TableCell>
          <TableCell class="text-xs text-muted-foreground">
            {{
              row.lastTransferredAt
                ? formatDateTime(row.lastTransferredAt, locale)
                : t("payouts.neverTransferred")
            }}
          </TableCell>
          <TableCell class="text-right">
            <Button
              data-testid="mark-payout"
              size="sm"
              variant="outline"
              :disabled="
                !row.payoutIban ||
                row.outstandingCents <= 0 ||
                pendingOrganizerId === row.organizerId
              "
              @click="markPayout.mutate(row.organizerId)"
            >
              {{
                pendingOrganizerId === row.organizerId
                  ? t("payouts.marking")
                  : t("payouts.markTransferred")
              }}
            </Button>

            <p
              v-if="failedOrganizerId === row.organizerId"
              data-testid="mark-payout-failed"
              class="mt-1 text-xs text-destructive"
            >
              {{ t("payouts.markFailed") }}
            </p>
            <p
              v-else-if="markedOrganizerId === row.organizerId"
              data-testid="mark-payout-done"
              class="mt-1 text-xs text-muted-foreground"
            >
              {{ t("payouts.marked") }}
            </p>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </main>
</template>
