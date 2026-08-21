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

const orders = useQuery({
  queryKey: ["allOrders"],
  queryFn: () => trpc.platform.listAllOrders.query(),
});

const matchingOrders = computed(() => {
  const term = search.value.trim().toLowerCase();
  const all = orders.data.value ?? [];

  if (!term) {
    return all;
  }

  return all.filter((order) =>
    [order.id, order.eventTitle, order.buyerName, order.buyerEmail].some((value) =>
      value.toLowerCase().includes(term),
    ),
  );
});
</script>

<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t("orders.title") }}</h1>
      <p class="mt-2 text-muted-foreground text-pretty">{{ t("orders.description") }}</p>
    </div>

    <div class="flex max-w-sm flex-col gap-2">
      <Label for="order-search">{{ t("orders.searchLabel") }}</Label>
      <Input id="order-search" v-model="search" :placeholder="t('orders.searchPlaceholder')" />
    </div>

    <p v-if="orders.isError.value" class="text-destructive">{{ t("orders.loadFailed") }}</p>

    <p
      v-else-if="!orders.data.value?.length && !orders.isPending.value"
      data-testid="platform-orders-empty"
      class="text-center text-muted-foreground"
    >
      {{ t("orders.empty") }}
    </p>

    <template v-else-if="orders.data.value?.length">
      <Table v-if="matchingOrders.length" class="min-w-4xl">
        <TableHeader>
          <TableRow>
            <TableHead>{{ t("orders.event") }}</TableHead>
            <TableHead>{{ t("orders.buyer") }}</TableHead>
            <TableHead>{{ t("orders.quantity") }}</TableHead>
            <TableHead>{{ t("orders.total") }}</TableHead>
            <TableHead>{{ t("orders.fee") }}</TableHead>
            <TableHead>{{ t("orders.status") }}</TableHead>
            <TableHead>{{ t("orders.provider") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="order in matchingOrders" :key="order.id" data-testid="platform-order-row">
            <TableCell>
              <p data-testid="platform-order-event">{{ order.eventTitle }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatDateTime(order.createdAt, locale) }}
              </p>
            </TableCell>
            <TableCell>
              <p>{{ order.buyerName }}</p>
              <p class="text-xs text-muted-foreground">{{ order.buyerEmail }}</p>
            </TableCell>
            <TableCell class="tabular-nums">{{ order.quantity }}</TableCell>
            <TableCell data-testid="platform-order-total" class="tabular-nums">
              {{ formatPriceInCents(order.totalCents, locale) }}
            </TableCell>
            <TableCell data-testid="platform-order-fee" class="tabular-nums">
              {{ formatPriceInCents(order.platformFeeCents, locale) }}
            </TableCell>
            <TableCell data-testid="platform-order-status">
              {{ t(`orders.statusLabel.${order.status}`) }}
            </TableCell>
            <TableCell class="text-xs text-muted-foreground">{{ order.paymentProvider }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <p v-else data-testid="platform-orders-no-match" class="text-center text-muted-foreground">
        {{ t("orders.noMatch") }}
      </p>
    </template>
  </main>
</template>
