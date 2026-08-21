<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { Check } from "lucide-vue-next";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpcClient";

const { t } = useI18n();
const router = useRouter();
const queryClient = useQueryClient();

const errorMessage = ref("");

const organizerBenefits = ["publishFast", "soldOutSafely", "scanAnywhere"] as const;

const becomeOrganizer = useMutation({
  mutationFn: () => trpc.user.becomeOrganizer.mutate(),
  onMutate: () => {
    errorMessage.value = "";
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    await router.push({ name: "organizerEvents" });
  },
  onError: () => {
    errorMessage.value = t("becomeOrganizer.failed");
  },
});
</script>

<template>
  <main class="mx-auto max-w-lg px-6 py-16">
    <Card>
      <CardHeader>
        <CardTitle>{{ t("becomeOrganizer.title") }}</CardTitle>
        <CardDescription>{{ t("becomeOrganizer.description") }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-6">
        <ul class="flex flex-col gap-3">
          <li v-for="benefit in organizerBenefits" :key="benefit" class="flex gap-3">
            <Check class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span class="text-sm text-pretty">{{ t(`landing.forOrganizers.${benefit}`) }}</span>
          </li>
        </ul>

        <p v-if="errorMessage" data-testid="become-organizer-error" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <Button
          data-testid="confirm-become-organizer"
          size="lg"
          :disabled="becomeOrganizer.isPending.value"
          @click="becomeOrganizer.mutate()"
        >
          {{
            becomeOrganizer.isPending.value
              ? t("becomeOrganizer.pending")
              : t("becomeOrganizer.confirm")
          }}
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
