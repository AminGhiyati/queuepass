<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpcClient";

const { t } = useI18n();
const queryClient = useQueryClient();

const iban = ref("");
const errorMessage = ref("");
const hasSavedIban = ref(false);

const payoutSettings = useQuery({
  queryKey: ["payoutSettings"],
  queryFn: () => trpc.payout.getMyPayoutSettings.query(),
});

const isFormReady = computed(() => payoutSettings.data.value !== undefined);

watch(
  payoutSettings.data,
  (stored) => {
    if (stored) {
      iban.value = stored.payoutIban ?? "";
    }
  },
  { immediate: true },
);

const enteredIban = computed(() => iban.value.trim());

const hasUnsavedIban = computed(
  () => enteredIban.value !== "" && enteredIban.value !== payoutSettings.data.value?.payoutIban,
);

const isMissingIban = computed(
  () => isFormReady.value && !payoutSettings.data.value?.payoutIban,
);

function messageFor(failure: unknown) {
  const message = failure instanceof Error ? failure.message : "";

  return message.includes("INVALID_IBAN")
    ? t("accountSettings.ibanInvalid")
    : t("accountSettings.saveFailed");
}

const savePayoutIban = useMutation({
  mutationFn: () => trpc.payout.updateMyPayoutIban.mutate({ iban: enteredIban.value }),
  onMutate: () => {
    errorMessage.value = "";
    hasSavedIban.value = false;
  },
  onSuccess: async () => {
    hasSavedIban.value = true;
    await queryClient.invalidateQueries({ queryKey: ["payoutSettings"] });
  },
  onError: (failure) => {
    errorMessage.value = messageFor(failure);
  },
});
</script>

<template>
  <main class="mx-auto flex max-w-lg flex-col gap-6 px-6 py-12">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">{{ t("accountSettings.title") }}</h1>
      <p class="mt-2 text-muted-foreground text-pretty">
        {{ t("accountSettings.description") }}
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("accountSettings.payoutTitle") }}</CardTitle>
        <CardDescription>{{ t("accountSettings.payoutDescription") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="payoutSettings.isError.value" class="text-sm text-destructive">
          {{ t("accountSettings.loadFailed") }}
        </p>

        <p v-else-if="!isFormReady" class="text-sm text-muted-foreground">
          {{ t("accountSettings.loading") }}
        </p>

        <form v-else class="flex flex-col gap-4" @submit.prevent="savePayoutIban.mutate()">
          <p
            v-if="isMissingIban"
            data-testid="payout-iban-missing"
            class="text-sm text-muted-foreground"
          >
            {{ t("accountSettings.missingIban") }}
          </p>

          <div class="flex flex-col gap-2">
            <Label for="iban">{{ t("accountSettings.ibanLabel") }}</Label>
            <Input
              id="iban"
              v-model="iban"
              autocomplete="off"
              spellcheck="false"
              :placeholder="t('accountSettings.ibanPlaceholder')"
              required
            />
            <p class="text-xs text-muted-foreground text-pretty">
              {{ t("accountSettings.ibanHint") }}
            </p>
          </div>

          <Button
            data-testid="save-iban"
            type="submit"
            class="self-start"
            :disabled="savePayoutIban.isPending.value || !hasUnsavedIban"
          >
            {{
              savePayoutIban.isPending.value
                ? t("accountSettings.saving")
                : t("accountSettings.save")
            }}
          </Button>

          <p v-if="errorMessage" data-testid="iban-error" class="text-sm text-destructive">
            {{ errorMessage }}
          </p>
          <p
            v-else-if="hasSavedIban && !hasUnsavedIban"
            data-testid="iban-saved"
            class="text-sm text-muted-foreground"
          >
            {{ t("accountSettings.saved") }}
          </p>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
