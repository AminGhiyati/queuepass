<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signOut } from "@/lib/authClient";
import { fetchCurrentUser, isAdministrator } from "@/lib/currentUser";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const isSigningIn = ref(false);
const hasFailed = ref(false);
const isBackofficeAccount = ref(route.query.rejected === "administrator");

async function submitLogin() {
  isSigningIn.value = true;
  hasFailed.value = false;
  isBackofficeAccount.value = false;

  const { error } = await signIn.email({ email: email.value, password: password.value });

  if (error) {
    isSigningIn.value = false;
    hasFailed.value = true;
    return;
  }

  const currentUser = await fetchCurrentUser();
  isSigningIn.value = false;

  if (isAdministrator(currentUser)) {
    await signOut();
    isBackofficeAccount.value = true;
    return;
  }

  const { redirectTo } = route.query;

  await router.push(typeof redirectTo === "string" ? redirectTo : { name: "landing" });
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-4">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{{ t("login.title") }}</CardTitle>
        <CardDescription>{{ t("login.description") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <p
          v-if="isBackofficeAccount"
          data-testid="backoffice-account-notice"
          class="mb-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground"
        >
          {{ t("login.backofficeAccount") }}
        </p>

        <form class="flex flex-col gap-4" @submit.prevent="submitLogin">
          <div class="flex flex-col gap-2">
            <Label for="email">{{ t("login.email") }}</Label>
            <Input id="email" v-model="email" type="email" autocomplete="email" required />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="password">{{ t("login.password") }}</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>

          <p v-if="hasFailed" class="text-sm text-destructive">{{ t("login.failed") }}</p>

          <Button type="submit" :disabled="isSigningIn">
            {{ isSigningIn ? t("login.pending") : t("login.submit") }}
          </Button>
        </form>
      </CardContent>
      <CardFooter class="justify-center gap-1 text-sm text-muted-foreground">
        {{ t("login.noAccount") }}
        <RouterLink :to="{ name: 'register' }" class="font-medium text-foreground underline">
          {{ t("login.toRegister") }}
        </RouterLink>
      </CardFooter>
    </Card>
  </main>
</template>
