<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps<{
  id?: string;
  type?: string;
  placeholder?: string;
  autocomplete?: string;
  required?: boolean;
  disabled?: boolean;
  class?: string;
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <input
    :id="props.id"
    v-model="model"
    :type="props.type ?? 'text'"
    :placeholder="props.placeholder"
    :autocomplete="props.autocomplete"
    :required="props.required"
    :disabled="props.disabled"
    :class="
      cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
