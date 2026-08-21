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
import { signUp } from "@/lib/authClient";
import { trpc } from "@/lib/trpcClient";

const MINIMUM_PASSWORD_LENGTH = 8;

const selectableRoles = [
  {
    value: "attendee",
    labelKey: "register.roleAttendee",
    hintKey: "register.roleAttendeeHint",
  },
  {
    value: "organizer",
    labelKey: "register.roleOrganizer",
    hintKey: "register.roleOrganizerHint",
  },
] as const;

type SelectableRole = (typeof selectableRoles)[number]["value"];

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const name = ref("");
const email = ref("");
const password = ref("");
const selectedRole = ref<SelectableRole>(
  route.query.role === "organizer" ? "organizer" : "attendee",
);
const isRegistering = ref(false);
const errorMessage = ref("");

function messageFor(errorCode: string | undefined) {
  if (errorCode === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return t("register.emailTaken");
  }
  if (errorCode === "PASSWORD_TOO_SHORT") {
    return t("register.passwordTooShort");
  }
  return t("register.failed");
}

async function submitRegistration() {
  isRegistering.value = true;
  errorMessage.value = "";

  const { error } = await signUp.email({
    name: name.value,
    email: email.value,
    password: password.value,
  });

  if (error) {
    isRegistering.value = false;
    errorMessage.value = messageFor(error.code);
    return;
  }

  if (selectedRole.value === "organizer") {
    try {
      await trpc.user.becomeOrganizer.mutate();
    } catch {
      isRegistering.value = false;
      errorMessage.value = t("register.organizerFailed");
      return;
    }
  }

  isRegistering.value = false;

  await router.push({ name: "landing" });
}
</script>

<template>
  <main class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{{ t("register.title") }}</CardTitle>
        <CardDescription>{{ t("register.description") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="submitRegistration">
          <div class="flex flex-col gap-2">
            <Label for="name">{{ t("register.name") }}</Label>
            <Input id="name" v-model="name" autocomplete="name" required />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="email">{{ t("register.email") }}</Label>
            <Input id="email" v-model="email" type="email" autocomplete="email" required />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="password">{{ t("register.password") }}</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              :minlength="MINIMUM_PASSWORD_LENGTH"
              required
            />
            <p class="text-xs text-muted-foreground">{{ t("register.passwordHint") }}</p>
          </div>

          <fieldset class="flex flex-col gap-2">
            <legend class="mb-2 text-sm font-medium">{{ t("register.roleLabel") }}</legend>
            <label
              v-for="role in selectableRoles"
              :key="role.value"
              class="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-checked:border-primary"
            >
              <input
                v-model="selectedRole"
                type="radio"
                name="role"
                :value="role.value"
                class="mt-1 accent-primary"
              />
              <span class="flex flex-col gap-0.5">
                <span class="text-sm font-medium">{{ t(role.labelKey) }}</span>
                <span class="text-xs text-muted-foreground">{{ t(role.hintKey) }}</span>
              </span>
            </label>
          </fieldset>

          <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>

          <Button type="submit" :disabled="isRegistering">
            {{ isRegistering ? t("register.pending") : t("register.submit") }}
          </Button>
        </form>
      </CardContent>
      <CardFooter class="justify-center gap-1 text-sm text-muted-foreground">
        {{ t("register.hasAccount") }}
        <RouterLink :to="{ name: 'login' }" class="font-medium text-foreground underline">
          {{ t("register.toLogin") }}
        </RouterLink>
      </CardFooter>
    </Card>
  </main>
</template>
