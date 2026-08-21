<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { ArrowLeft } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceInCents } from "@/lib/formatEvent";
import { trpc } from "@/lib/trpcClient";

const MAXIMUM_TICKETS_PER_ORDER = 10;

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const eventId = computed(() => String(route.params.eventId));
const quantity = ref("1");
const errorMessage = ref("");

const event = useQuery({
  queryKey: ["publishedEvent", eventId],
  queryFn: () => trpc.event.getPublishedEvent.query({ eventId: eventId.value }),
  retry: false,
});

const buyableCount = computed(() =>
  Math.min(event.data.value?.availableCount ?? 0, MAXIMUM_TICKETS_PER_ORDER),
);

const requestedQuantity = computed(() => Number(quantity.value));

const isQuantityValid = computed(
  () =>
    Number.isInteger(requestedQuantity.value) &&
    requestedQuantity.value >= 1 &&
    requestedQuantity.value <= buyableCount.value,
);

const isOnSale = computed(
  () =>
    event.data.value?.status === "PUBLISHED" &&
    !event.data.value.isSoldOut &&
    !event.data.value.hasEnded,
);

const totalCents = computed(() =>
  isQuantityValid.value ? (event.data.value?.priceCents ?? 0) * requestedQuantity.value : 0,
);

function priceLabel(priceCents: number) {
  return priceCents === 0 ? t("event.free") : formatPriceInCents(priceCents, locale.value);
}

function messageFor(failure: unknown) {
  const message = failure instanceof Error ? failure.message : "";

  if (message.includes("NOT_ENOUGH_TICKETS_LEFT")) {
    return t("checkout.notEnoughLeft");
  }
  if (message.includes("PRICE_BELOW_MINIMUM")) {
    return t("checkout.priceBelowMinimum");
  }
  return t("checkout.failed");
}

const buyTickets = useMutation({
  mutationFn: () =>
    trpc.order.createOrder.mutate({ eventId: eventId.value, quantity: requestedQuantity.value }),
  onSuccess: async (order) => {
    if (order.redirectUrl) {
      window.location.assign(order.redirectUrl);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["myTickets"] });
    await router.push(
      order.isPaid
        ? { name: "myTickets" }
        : { name: "orderStatus", params: { orderId: order.orderId } },
    );
  },
  onError: (failure) => {
    errorMessage.value = messageFor(failure);
  },
});

function submitPurchase() {
  errorMessage.value = "";
  buyTickets.mutate();
}
</script>

<template>
  <main class="mx-auto max-w-lg px-6 py-12">
    <RouterLink
      :to="{ name: 'eventDetail', params: { eventId } }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      {{ t("checkout.back") }}
    </RouterLink>

    <p v-if="event.isError.value" class="mt-12 text-center text-muted-foreground">
      {{ t("checkout.loadFailed") }}
    </p>

    <Card v-else-if="event.data.value" class="mt-6">
      <CardHeader>
        <CardTitle>{{ t("checkout.title") }}</CardTitle>
        <p class="text-sm text-muted-foreground">{{ event.data.value.title }}</p>
      </CardHeader>
      <CardContent>
        <p
          v-if="event.data.value.hasEnded"
          data-testid="checkout-unavailable"
          class="text-sm text-destructive"
        >
          {{ t("checkout.over") }}
        </p>
        <p
          v-else-if="event.data.value.status === 'CANCELLED'"
          data-testid="checkout-unavailable"
          class="text-sm text-destructive"
        >
          {{ t("checkout.cancelled") }}
        </p>
        <p
          v-else-if="event.data.value.isSoldOut"
          data-testid="checkout-unavailable"
          class="text-sm text-destructive"
        >
          {{ t("checkout.soldOut") }}
        </p>

        <form v-if="isOnSale" class="flex flex-col gap-5" @submit.prevent="submitPurchase">
          <div class="flex flex-col gap-2">
            <Label for="quantity">{{ t("checkout.quantity") }}</Label>
            <Input
              id="quantity"
              v-model="quantity"
              type="number"
              inputmode="numeric"
              min="1"
              :max="buyableCount"
              step="1"
              required
            />
            <p class="text-xs text-muted-foreground">
              {{ t("checkout.quantityHint", { max: buyableCount }) }}
            </p>
          </div>

          <dl class="flex flex-col gap-2 border-t pt-4 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted-foreground">{{ t("checkout.unitPrice") }}</dt>
              <dd>{{ priceLabel(event.data.value.priceCents) }}</dd>
            </div>
            <div class="flex justify-between font-medium">
              <dt>{{ t("checkout.total") }}</dt>
              <dd data-testid="checkout-total">{{ priceLabel(totalCents) }}</dd>
            </div>
          </dl>

          <p v-if="errorMessage" data-testid="checkout-error" class="text-sm text-destructive">
            {{ errorMessage }}
          </p>

          <Button
            data-testid="confirm-purchase"
            type="submit"
            :disabled="buyTickets.isPending.value || !isQuantityValid"
          >
            {{ buyTickets.isPending.value ? t("checkout.buying") : t("checkout.buy") }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
