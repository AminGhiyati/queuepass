<script setup lang="ts">
import { Wallet } from "lucide-vue-next";
import { Button, buttonVariants } from "@/components/ui/button";

defineProps<{ available: boolean; href: string; label: string }>();
</script>

<template>
  <a v-if="available" :href="href" :class="buttonVariants({ variant: 'outline', size: 'sm' })">
    <Wallet class="size-4" />
    {{ label }}
  </a>
  <Button v-else variant="outline" size="sm" disabled>
    <Wallet class="size-4" />
    {{ label }}
  </Button>
</template>
