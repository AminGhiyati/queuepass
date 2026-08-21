<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps<{ colspan: number; class?: string }>();
</script>

<template>
  <tr>
    <td :colspan="props.colspan" :class="cn('p-8 text-center text-muted-foreground', props.class)">
      <slot />
    </td>
  </tr>
</template>
