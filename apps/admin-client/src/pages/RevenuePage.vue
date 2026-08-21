<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatPriceInCents } from "@/lib/formatMoney";
import { trpc } from "@/lib/trpcClient";

const MAXIMUM_FEE_PERCENT = 50;

const { t, locale } = useI18n();
const queryClient = useQueryClient();

const feePercent = ref("5");
const feeFailed = ref(false);
const savedFeePercent = ref<number | null>(null);

const report = useQuery({
  queryKey: ["revenueReport"],
  queryFn: () => trpc.platform.getRevenueReport.query(),
});

const settings = useQuery({
  queryKey: ["platformSettings"],
  queryFn: () => trpc.platform.getPlatformSettings.query(),
});

const isFeeFormReady = computed(() => settings.data.value !== undefined);

watch(
  settings.data,
  (stored) => {
    if (stored) {
      feePercent.value = String(stored.feePercent);
    }
  },
  { immediate: true },
);

const enteredFee = computed(() => String(feePercent.value).trim());
const enteredFeePercent = computed(() => Number(enteredFee.value));

const isEnteredFeeValid = computed(
  () =>
    enteredFee.value !== "" &&
    Number.isInteger(enteredFeePercent.value) &&
    enteredFeePercent.value >= 0 &&
    enteredFeePercent.value <= MAXIMUM_FEE_PERCENT,
);

const hasUnsavedFee = computed(
  () =>
    isEnteredFeeValid.value &&
    enteredFeePercent.value !== settings.data.value?.feePercent,
);

const isFeeSaved = computed(
  () =>
    savedFeePercent.value !== null &&
    savedFeePercent.value === enteredFeePercent.value,
);

const saveFee = useMutation({
  mutationFn: () =>
    trpc.platform.updatePlatformSettings.mutate({
      feePercent: enteredFeePercent.value,
    }),
  onMutate: () => {
    feeFailed.value = false;
  },
  onSuccess: async ({ feePercent: storedFeePercent }) => {
    savedFeePercent.value = storedFeePercent;
    await queryClient.invalidateQueries({ queryKey: ["platformSettings"] });
  },
  onError: () => {
    feeFailed.value = true;
  },
});

function money(cents: number) {
  return formatPriceInCents(cents, locale.value);
}
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        {{ t("revenue.title") }}
      </h1>
      <p class="mt-2 text-muted-foreground text-pretty">
        {{ t("revenue.description") }}
      </p>
    </div>

    <p v-if="report.isError.value" class="text-destructive">
      {{ t("revenue.loadFailed") }}
    </p>

    <template v-else-if="report.data.value">
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent class="p-4 sm:p-5">
            <p class="text-sm text-muted-foreground">
              {{ t("revenue.ticketsSold") }}
            </p>
            <p
              data-testid="total-tickets"
              class="mt-1 text-xl font-semibold tabular-nums sm:text-2xl"
            >
              {{ report.data.value.totals.ticketsSold }}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-4 sm:p-5">
            <p class="text-sm text-muted-foreground">
              {{ t("revenue.gross") }}
            </p>
            <p
              data-testid="total-gross"
              class="mt-1 text-xl font-semibold tabular-nums sm:text-2xl"
            >
              {{ money(report.data.value.totals.grossCents) }}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-4 sm:p-5">
            <p class="text-sm text-muted-foreground">
              {{ t("revenue.platformFee") }}
            </p>
            <p
              data-testid="total-fee"
              class="mt-1 text-xl font-semibold tabular-nums sm:text-2xl"
            >
              {{ money(report.data.value.totals.platformFeeCents) }}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-4 sm:p-5">
            <p class="text-sm text-muted-foreground">
              {{ t("revenue.payout") }}
            </p>
            <p
              data-testid="total-payout"
              class="mt-1 text-xl font-semibold tabular-nums sm:text-2xl"
            >
              {{ money(report.data.value.totals.payoutCents) }}
            </p>
          </CardContent>
        </Card>
      </div>

      <Table v-if="report.data.value.organizers.length" class="min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>{{ t("revenue.organizer") }}</TableHead>
            <TableHead>{{ t("revenue.ticketsSold") }}</TableHead>
            <TableHead>{{ t("revenue.gross") }}</TableHead>
            <TableHead>{{ t("revenue.platformFee") }}</TableHead>
            <TableHead>{{ t("revenue.payout") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="organizer in report.data.value.organizers"
            :key="organizer.organizerId"
            data-testid="revenue-row"
          >
            <TableCell>
              <p data-testid="revenue-organizer">
                {{ organizer.organizerName }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ organizer.organizerEmail }}
              </p>
            </TableCell>
            <TableCell class="tabular-nums">{{
              organizer.ticketsSold
            }}</TableCell>
            <TableCell class="tabular-nums">{{
              money(organizer.grossCents)
            }}</TableCell>
            <TableCell class="tabular-nums">{{
              money(organizer.platformFeeCents)
            }}</TableCell>
            <TableCell class="tabular-nums">{{
              money(organizer.payoutCents)
            }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <p
        v-else
        data-testid="revenue-empty"
        class="text-center text-muted-foreground"
      >
        {{ t("revenue.empty") }}
      </p>
    </template>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("revenue.feeTitle") }}</CardTitle>
        <CardDescription>{{ t("revenue.feeDescription") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="!isFeeFormReady" class="text-sm text-muted-foreground">
          {{ t("revenue.feeLoading") }}
        </p>

        <form
          v-else
          class="flex flex-col gap-4"
          @submit.prevent="saveFee.mutate()"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div class="flex flex-col gap-2">
              <Label for="fee">{{ t("revenue.feeLabel") }}</Label>
              <Input
                id="fee"
                v-model="feePercent"
                type="number"
                inputmode="numeric"
                min="0"
                :max="MAXIMUM_FEE_PERCENT"
                step="1"
                class="sm:w-32"
                required
              />
            </div>
            <Button
              data-testid="save-fee"
              type="submit"
              :disabled="saveFee.isPending.value || !hasUnsavedFee"
            >
              {{
                saveFee.isPending.value
                  ? t("revenue.feeSaving")
                  : t("revenue.feeSave")
              }}
            </Button>
          </div>

          <p
            v-if="isFeeSaved"
            data-testid="fee-saved"
            class="text-sm text-muted-foreground"
          >
            {{ t("revenue.feeSaved") }}
          </p>
          <p
            v-else-if="feeFailed"
            data-testid="fee-failed"
            class="text-sm text-destructive"
          >
            {{ t("revenue.feeFailed") }}
          </p>
          <p
            v-else-if="!isEnteredFeeValid"
            data-testid="fee-invalid"
            class="text-sm text-destructive"
          >
            {{ t("revenue.feeInvalid") }}
          </p>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
