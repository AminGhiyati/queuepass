<script setup lang="ts">
import { Ticket } from "lucide-vue-next";

defineProps<{
  imageUrl: string | null;
  title: string;
}>();
</script>

<template>
  <img v-if="imageUrl" :src="imageUrl" :alt="title" class="object-cover" />
  <div
    v-else
    data-testid="event-image-placeholder"
    class="flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20"
  >
    <Ticket class="size-10 text-muted-foreground/50" aria-hidden="true" />
  </div>
</template>
