<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { ArrowLeft, Download, Printer } from "lucide-vue-next";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import WalletPassLink from "@/components/WalletPassLink.vue";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiUrl";
import { formatDateTime, formatPriceInCents } from "@/lib/formatEvent";
import { renderQrCodeDataUrl } from "@/lib/qrCode";
import { trpc } from "@/lib/trpcClient";

const { t, locale } = useI18n();
const route = useRoute();

const ticketId = computed(() => String(route.params.ticketId));

const myTicket = useQuery({
  queryKey: ["myTicket", ticketId],
  queryFn: () => trpc.ticket.getMyTicket.query({ ticketId: ticketId.value }),
  retry: false,
});

const ticket = computed(() => myTicket.data.value);
const isValid = computed(() => ticket.value?.isValid === true);

const qrCode = useQuery({
  queryKey: ["ticketQrCode", ticketId],
  queryFn: () => renderQrCodeDataUrl(String(myTicket.data.value?.code)),
  enabled: computed(() => Boolean(myTicket.data.value?.code) && isValid.value),
});

const refundNotice = computed(() => {
  if (!ticket.value || ticket.value.orderStatus === "PAID") {
    return null;
  }

  const amount = formatPriceInCents(ticket.value.pricePaidCents, locale.value);

  if (ticket.value.orderStatus === "REFUNDED" && ticket.value.refundedAt) {
    return t("ticket.refunded", {
      amount,
      when: formatDateTime(ticket.value.refundedAt, locale.value),
    });
  }

  return ticket.value.orderStatus === "REFUND_FAILED"
    ? t("ticket.refundFailed", { amount })
    : t("ticket.refundPending", { amount });
});

const checkInStatus = computed(() => {
  if (!ticket.value?.checkedInAt) {
    return t("ticket.notCheckedIn");
  }

  return t("ticket.checkedInAt", {
    when: formatDateTime(ticket.value.checkedInAt, locale.value),
  });
});

const ticketPdfUrl = computed(
  () => `${apiUrl}/tickets/${ticketId.value}/pdf?locale=${locale.value}`,
);
const applePassUrl = computed(() => `${apiUrl}/tickets/${ticketId.value}/pkpass`);
const googleWalletUrl = computed(() => `${apiUrl}/tickets/${ticketId.value}/google-wallet`);

const walletAvailability = useQuery({
  queryKey: ["walletAvailability"],
  queryFn: () => trpc.ticket.getWalletAvailability.query(),
});

const applePassAvailable = computed(() => walletAvailability.data.value?.applePass === true);
const googleWalletAvailable = computed(() => walletAvailability.data.value?.googleWallet === true);

function printTicket() {
  window.print();
}
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-10">
    <RouterLink
      :to="{ name: 'myTickets' }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground print:hidden"
    >
      <ArrowLeft class="size-4" />
      {{ t("ticket.backToTickets") }}
    </RouterLink>

    <p v-if="myTicket.isError.value" class="mt-12 text-center text-muted-foreground">
      {{ t("ticket.notFound") }}
    </p>

    <Card v-else-if="ticket" class="mt-6">
      <CardContent class="flex flex-col items-center gap-5 p-6 text-center">
        <div>
          <h1 data-testid="ticket-event-title" class="text-xl font-semibold text-balance">
            {{ ticket.event.title }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ formatDateTime(ticket.event.startsAt, locale) }} · {{ ticket.event.location }}
          </p>
        </div>

        <div
          v-if="ticket.event.status === 'CANCELLED'"
          data-testid="ticket-event-cancelled"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <p>{{ t("ticket.eventCancelled") }}</p>
          <p v-if="refundNotice" data-testid="ticket-refund" class="mt-2">{{ refundNotice }}</p>
        </div>

        <img
          v-if="qrCode.data.value"
          data-testid="ticket-qr-code"
          :src="qrCode.data.value"
          :alt="t('ticket.scanHint')"
          class="size-64 rounded-md bg-white"
        />

        <p v-if="isValid" class="text-sm text-muted-foreground print:hidden">
          {{ t("ticket.scanHint") }}
        </p>

        <div>
          <p class="text-xs text-muted-foreground">{{ t("ticket.code") }}</p>
          <p data-testid="ticket-code" class="font-mono text-sm break-all">{{ ticket.code }}</p>
        </div>

        <p data-testid="ticket-status" class="text-sm text-muted-foreground">
          {{ checkInStatus }}
        </p>

        <div v-if="isValid" class="flex flex-col items-stretch gap-2 print:hidden">
          <div class="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" @click="printTicket">
              <Printer class="size-4" />
              {{ t("ticket.print") }}
            </Button>
            <a
              data-testid="ticket-pdf-link"
              :href="ticketPdfUrl"
              :class="buttonVariants({ variant: 'outline', size: 'sm' })"
            >
              <Download class="size-4" />
              {{ t("ticket.download") }}
            </a>
          </div>

          <div class="flex flex-wrap justify-center gap-2">
            <WalletPassLink
              data-testid="apple-wallet"
              :available="applePassAvailable"
              :href="applePassUrl"
              :label="t('ticket.appleWallet')"
            />
            <WalletPassLink
              data-testid="google-wallet"
              :available="googleWalletAvailable"
              :href="googleWalletUrl"
              :label="t('ticket.googleWallet')"
            />
          </div>
          <p
            v-if="!applePassAvailable || !googleWalletAvailable"
            class="text-xs text-muted-foreground"
          >
            {{ t("ticket.walletUnavailable") }}
          </p>
        </div>
      </CardContent>
    </Card>
  </main>
</template>
