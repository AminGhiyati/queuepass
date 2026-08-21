<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { CheckCircle2, Clock, XCircle } from "lucide-vue-next";
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceInCents } from "@/lib/formatEvent";
import { trpc } from "@/lib/trpcClient";

const PAYMENT_POLL_INTERVAL = 2000;

const { t, locale } = useI18n();
const route = useRoute();
const queryClient = useQueryClient();

const orderId = computed(() => String(route.params.orderId));
const leftPaymentPage = computed(() => route.query.checkout === "cancelled");

const order = useQuery({
  queryKey: ["myOrder", orderId],
  queryFn: () => trpc.order.getMyOrder.query({ orderId: orderId.value }),
  refetchInterval: (query) =>
    query.state.data?.status === "PENDING" ? PAYMENT_POLL_INTERVAL : false,
  retry: false,
});

const isWaitingForPayment = computed(() => order.data.value?.status === "PENDING");
const isReleased = computed(() => order.data.value?.status === "CANCELLED");

watch(
  () => order.data.value?.isPaid,
  (isPaid) => {
    if (isPaid) {
      queryClient.invalidateQueries({ queryKey: ["myTickets"] });
    }
  },
);
</script>

<template>
  <main class="mx-auto max-w-lg px-6 py-12">
    <p
      v-if="order.isError.value"
      data-testid="order-load-failed"
      class="text-center text-muted-foreground"
    >
      {{ t("orderStatus.loadFailed") }}
    </p>

    <Card v-else-if="order.data.value">
      <CardHeader>
        <CardTitle>{{ t("orderStatus.title") }}</CardTitle>
        <p class="text-sm text-muted-foreground">{{ order.data.value.eventTitle }}</p>
      </CardHeader>
      <CardContent class="flex flex-col gap-5">
        <div
          v-if="order.data.value.isPaid"
          data-testid="order-state"
          class="flex items-center gap-3"
        >
          <CheckCircle2 class="size-5 shrink-0 text-primary" />
          <div>
            <p class="font-medium">{{ t("orderStatus.paid") }}</p>
            <p class="text-sm text-muted-foreground">{{ t("orderStatus.paidHint") }}</p>
          </div>
        </div>

        <div
          v-else-if="isWaitingForPayment && leftPaymentPage"
          data-testid="order-state"
          class="flex items-center gap-3"
        >
          <XCircle class="size-5 shrink-0 text-destructive" />
          <div>
            <p class="font-medium">{{ t("orderStatus.checkoutLeft") }}</p>
            <p class="text-sm text-muted-foreground">{{ t("orderStatus.checkoutLeftHint") }}</p>
          </div>
        </div>

        <div
          v-else-if="isWaitingForPayment"
          data-testid="order-state"
          class="flex items-center gap-3"
        >
          <Clock class="size-5 shrink-0 text-muted-foreground" />
          <div>
            <p class="font-medium">{{ t("orderStatus.pending") }}</p>
            <p class="text-sm text-muted-foreground">{{ t("orderStatus.pendingHint") }}</p>
          </div>
        </div>

        <div v-else-if="isReleased" data-testid="order-state" class="flex items-center gap-3">
          <XCircle class="size-5 shrink-0 text-destructive" />
          <div>
            <p class="font-medium">{{ t("orderStatus.released") }}</p>
            <p class="text-sm text-muted-foreground">{{ t("orderStatus.releasedHint") }}</p>
          </div>
        </div>

        <dl class="flex flex-col gap-2 border-t pt-4 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted-foreground">{{ t("orderStatus.quantity") }}</dt>
            <dd data-testid="order-quantity">{{ order.data.value.quantity }}</dd>
          </div>
          <div class="flex justify-between font-medium">
            <dt>{{ t("orderStatus.total") }}</dt>
            <dd data-testid="order-total">
              {{
                order.data.value.totalCents === 0
                  ? t("event.free")
                  : formatPriceInCents(order.data.value.totalCents, locale)
              }}
            </dd>
          </div>
        </dl>

        <RouterLink
          v-if="order.data.value.isPaid"
          data-testid="order-show-tickets"
          :to="{ name: 'myTickets' }"
          :class="buttonVariants()"
        >
          {{ t("orderStatus.showTickets") }}
        </RouterLink>

        <RouterLink
          v-else-if="isWaitingForPayment && leftPaymentPage"
          data-testid="order-pay-again"
          :to="{ name: 'checkout', params: { eventId: order.data.value.eventId } }"
          :class="buttonVariants()"
        >
          {{ t("orderStatus.payAgain") }}
        </RouterLink>

        <RouterLink
          v-else-if="isReleased"
          data-testid="order-back-to-event"
          :to="{ name: 'eventDetail', params: { eventId: order.data.value.eventId } }"
          :class="buttonVariants({ variant: 'outline' })"
        >
          {{ t("orderStatus.backToEvent") }}
        </RouterLink>
      </CardContent>
    </Card>
  </main>
</template>
