<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
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
import { signIn, signOut } from "@/lib/authClient";
import { fetchCurrentAdmin } from "@/lib/currentAdmin";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

type LoginErrorKey = "login.failed" | "login.notAnAdmin";

const email = ref("");
const password = ref("");
const isSigningIn = ref(false);
const errorKey = ref<LoginErrorKey | null>(
  route.query.rejected === "notAnAdmin" ? "login.notAnAdmin" : null,
);

async function submitLogin() {
  isSigningIn.value = true;
  errorKey.value = null;

  const { error } = await signIn.email({ email: email.value, password: password.value });

  if (error) {
    errorKey.value = "login.failed";
    isSigningIn.value = false;
    return;
  }

  const currentAdmin = await fetchCurrentAdmin();
  isSigningIn.value = false;

  if (!currentAdmin) {
    await signOut();
    errorKey.value = "login.notAnAdmin";
    return;
  }

  await router.push({ name: "revenue" });
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

          <p v-if="errorKey" class="text-sm text-destructive">{{ t(errorKey) }}</p>

          <Button type="submit" :disabled="isSigningIn">
            {{ isSigningIn ? t("login.pending") : t("login.submit") }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
