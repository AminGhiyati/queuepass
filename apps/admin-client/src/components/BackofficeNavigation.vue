<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { Menu, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/authClient";

const { t } = useI18n();
const router = useRouter();
const session = useSession();
const queryClient = useQueryClient();

const isMenuOpen = ref(false);

const isSignedIn = computed(() => Boolean(session.value?.data));

const backofficeLinks = [
  { routeName: "revenue", labelKey: "nav.revenue" },
  { routeName: "events", labelKey: "nav.events" },
  { routeName: "orders", labelKey: "nav.orders" },
  { routeName: "payouts", labelKey: "nav.payouts" },
];

function closeMenu() {
  isMenuOpen.value = false;
}

async function endSession() {
  closeMenu();
  await signOut();
  queryClient.clear();
  await router.push({ name: "login" });
}
</script>

<template>
  <header class="border-b">
    <div class="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
      <div class="flex min-w-0 items-center gap-6">
        <span class="truncate font-semibold">{{ t("appName") }}</span>

        <nav
          v-if="isSignedIn"
          class="hidden items-center gap-4 md:flex"
          :aria-label="t('nav.label')"
        >
          <RouterLink
            v-for="link in backofficeLinks"
            :key="link.routeName"
            :to="{ name: link.routeName }"
            class="text-sm text-muted-foreground hover:text-foreground"
          >
            {{ t(link.labelKey) }}
          </RouterLink>
        </nav>
      </div>

      <div class="hidden items-center gap-2 md:flex">
        <LanguageSwitcher />
        <Button v-if="isSignedIn" variant="outline" size="sm" @click="endSession">
          {{ t("session.signOut") }}
        </Button>
      </div>

      <Button
        data-testid="menu-toggle"
        variant="ghost"
        size="icon"
        class="md:hidden"
        :aria-label="isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')"
        :aria-expanded="isMenuOpen"
        aria-controls="backoffice-menu"
        @click="isMenuOpen = !isMenuOpen"
      >
        <X v-if="isMenuOpen" class="size-5" />
        <Menu v-else class="size-5" />
      </Button>
    </div>

    <div
      v-if="isMenuOpen"
      id="backoffice-menu"
      data-testid="mobile-menu"
      class="flex flex-col gap-4 border-t px-4 py-4 md:hidden"
    >
      <nav
        v-if="isSignedIn"
        class="flex flex-col gap-4"
        :aria-label="t('nav.label')"
      >
        <RouterLink
          v-for="link in backofficeLinks"
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
      </div>
    </div>
  </header>
</template>
