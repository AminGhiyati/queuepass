<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { Menu, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import { Button, buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/authClient";
import { useCurrentUser } from "@/lib/useCurrentUser";

const { t } = useI18n();
const router = useRouter();
const queryClient = useQueryClient();
const { hasSession, isSignedIn, signedInAsAdministrator, isOrganizer } = useCurrentUser();

const isMenuOpen = ref(false);

const offersSignIn = computed(() => !hasSession.value || signedInAsAdministrator.value);

const navigationLinks = computed(() => [
  { routeName: "events", labelKey: "nav.discoverEvents" },
  ...(isSignedIn.value ? [{ routeName: "myTickets", labelKey: "nav.myTickets" }] : []),
  ...(isOrganizer.value
    ? [
        { routeName: "organizerEvents", labelKey: "nav.myEvents" },
        { routeName: "accountSettings", labelKey: "nav.account" },
      ]
    : []),
]);

function closeMenu() {
  isMenuOpen.value = false;
}

async function endSession() {
  closeMenu();
  await signOut();
  queryClient.clear();
  await router.push({ name: "landing" });
}
</script>

<template>
  <header class="border-b">
    <div class="flex h-16 items-center justify-between px-6">
      <div class="flex items-center gap-6">
        <RouterLink :to="{ name: 'landing' }" class="font-semibold" @click="closeMenu">
          {{ t("appName") }}
        </RouterLink>

        <nav class="hidden items-center gap-6 sm:flex" :aria-label="t('nav.label')">
          <RouterLink
            v-for="link in navigationLinks"
            :key="link.routeName"
            :to="{ name: link.routeName }"
            class="text-sm text-muted-foreground hover:text-foreground"
          >
            {{ t(link.labelKey) }}
          </RouterLink>
        </nav>
      </div>

      <div class="hidden items-center gap-2 sm:flex">
        <LanguageSwitcher />
        <Button v-if="isSignedIn" variant="outline" size="sm" @click="endSession">
          {{ t("session.signOut") }}
        </Button>
        <RouterLink
          v-else-if="offersSignIn"
          :to="{ name: 'login' }"
          :class="buttonVariants({ variant: 'outline', size: 'sm' })"
        >
          {{ t("nav.signIn") }}
        </RouterLink>
      </div>

      <Button
        data-testid="menu-toggle"
        variant="ghost"
        size="icon"
        class="sm:hidden"
        :aria-label="isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')"
        :aria-expanded="isMenuOpen"
        aria-controls="mobile-menu"
        @click="isMenuOpen = !isMenuOpen"
      >
        <X v-if="isMenuOpen" class="size-5" />
        <Menu v-else class="size-5" />
      </Button>
    </div>

    <div
      v-if="isMenuOpen"
      id="mobile-menu"
      data-testid="mobile-menu"
      class="flex flex-col gap-4 border-t px-6 py-4 sm:hidden"
    >
      <nav class="flex flex-col gap-4" :aria-label="t('nav.label')">
        <RouterLink
          v-for="link in navigationLinks"
          :key="link.routeName"
          :to="{ name: link.routeName }"
          class="text-sm text-muted-foreground hover:text-foreground"
          @click="closeMenu"
        >
          {{ t(link.labelKey) }}
        </RouterLink>
      </nav>

      <div class="flex items-center justify-between gap-2 border-t pt-4">
        <LanguageSwitcher />
        <Button v-if="isSignedIn" variant="outline" size="sm" @click="endSession">
          {{ t("session.signOut") }}
        </Button>
        <RouterLink
          v-else-if="offersSignIn"
          :to="{ name: 'login' }"
          :class="buttonVariants({ variant: 'outline', size: 'sm' })"
          @click="closeMenu"
        >
          {{ t("nav.signIn") }}
        </RouterLink>
      </div>
    </div>
  </header>
</template>
