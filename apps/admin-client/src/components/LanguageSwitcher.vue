<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { availableLocales, changeLocale } from "@/i18n/i18n";

const { locale, t } = useI18n();
</script>

<template>
  <nav
    data-testid="language-switcher"
    class="flex items-center gap-1"
    :aria-label="t('language.label')"
  >
    <Button
      v-for="selectableLocale in availableLocales"
      :key="selectableLocale"
      size="sm"
      :variant="locale === selectableLocale ? 'secondary' : 'ghost'"
      :title="t(`language.${selectableLocale}`)"
      @click="changeLocale(selectableLocale)"
    >
      {{ selectableLocale.toUpperCase() }}
    </Button>
  </nav>
</template>
