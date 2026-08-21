<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { ArrowLeft, Upload } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import EventImage from "@/components/EventImage.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateTimeInputValue } from "@/lib/formatEvent";
import { trpc } from "@/lib/trpcClient";

type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

const uploadableImageTypes: ImageContentType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const eventId = computed(() =>
  route.params.eventId ? String(route.params.eventId) : null,
);
const isEditing = computed(() => eventId.value !== null);

const title = ref("");
const description = ref("");
const location = ref("");
const startsAt = ref("");
const endsAt = ref("");
const priceInEuros = ref("0");
const capacity = ref("100");
const imageKey = ref<string | null>(null);
const imageUrl = ref<string | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const errorMessage = ref("");

const editedEvent = useQuery({
  queryKey: ["myEvent", eventId],
  queryFn: () =>
    trpc.event.getMyEvent.query({ eventId: String(eventId.value) }),
  enabled: isEditing,
});

const isFormReady = computed(
  () => !isEditing.value || Boolean(editedEvent.data.value),
);

const earliestStart = computed(() => {
  const startOfEditedEvent = editedEvent.data.value?.startsAt;

  if (startOfEditedEvent && startOfEditedEvent < new Date()) {
    return undefined;
  }

  return toDateTimeInputValue(new Date());
});

watch(
  editedEvent.data,
  (event) => {
    if (!event) {
      return;
    }

    title.value = event.title;
    description.value = event.description;
    location.value = event.location;
    startsAt.value = toDateTimeInputValue(event.startsAt);
    endsAt.value = toDateTimeInputValue(event.endsAt);
    priceInEuros.value = String(event.priceCents / 100);
    capacity.value = String(event.capacity);
    imageKey.value = event.imageKey;
    imageUrl.value = event.imageUrl;
  },
  { immediate: true },
);

const uploadImage = useMutation({
  mutationFn: async (file: File) => {
    const contentType = file.type as ImageContentType;
    const upload = await trpc.event.createEventImageUploadUrl.mutate({
      contentType,
    });

    const response = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });

    if (!response.ok) {
      throw new Error("UPLOAD_REJECTED");
    }

    return upload.imageKey;
  },
  onSuccess: (uploadedImageKey) => {
    imageKey.value = uploadedImageKey;
    errorMessage.value = "";
  },
  onError: () => {
    errorMessage.value = t("eventForm.uploadFailed");
  },
});

function openImagePicker() {
  imageInput.value?.click();
}

function selectImage(changeEvent: Event) {
  const file = (changeEvent.target as HTMLInputElement).files?.[0];

  if (!file || !uploadableImageTypes.includes(file.type as ImageContentType)) {
    errorMessage.value = t("eventForm.uploadFailed");
    return;
  }

  imageUrl.value = URL.createObjectURL(file);
  uploadImage.mutate(file);
}

function messageFor(failure: unknown) {
  const message = failure instanceof Error ? failure.message : "";

  if (message.includes("CAPACITY_BELOW_SOLD_TICKETS")) {
    return t("eventForm.capacityBelowSold");
  }
  if (message.includes("PRICE_BELOW_MINIMUM")) {
    return t("eventForm.priceBelowMinimum");
  }
  if (message.includes("EVENT_STARTS_IN_THE_PAST")) {
    return t("eventForm.startsInPast");
  }
  if (message.includes("endsAt") || message.includes("has to end")) {
    return t("eventForm.endBeforeStart");
  }
  return t("eventForm.saveFailed");
}

const saveEvent = useMutation({
  mutationFn: () => {
    const details = {
      title: title.value,
      description: description.value,
      location: location.value,
      startsAt: new Date(startsAt.value),
      endsAt: new Date(endsAt.value),
      priceCents: Math.round(Number(priceInEuros.value) * 100),
      capacity: Number(capacity.value),
      imageKey: imageKey.value,
    };

    return eventId.value
      ? trpc.event.updateEvent.mutate({ eventId: eventId.value, details })
      : trpc.event.createEvent.mutate(details);
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["myEvents"] });
    await router.push({ name: "organizerEvents" });
  },
  onError: (failure) => {
    errorMessage.value = messageFor(failure);
  },
});

function submitEvent() {
  errorMessage.value = "";
  saveEvent.mutate();
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-6 py-12">
    <RouterLink
      :to="{ name: 'organizerEvents' }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      {{ t("eventForm.back") }}
    </RouterLink>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle>
          {{
            isEditing ? t("eventForm.editTitle") : t("eventForm.createTitle")
          }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p v-if="!isFormReady" class="text-sm text-muted-foreground">
          {{ t("eventForm.loading") }}
        </p>

        <form v-else class="flex flex-col gap-4" @submit.prevent="submitEvent">
          <div class="flex flex-col gap-2">
            <Label for="title">{{ t("eventForm.name") }}</Label>
            <Input id="title" v-model="title" required maxlength="120" />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="description">{{ t("eventForm.description") }}</Label>
            <textarea
              id="description"
              v-model="description"
              required
              maxlength="4000"
              rows="5"
              class="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="location">{{ t("eventForm.location") }}</Label>
            <Input id="location" v-model="location" required maxlength="200" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="startsAt">{{ t("eventForm.startsAt") }}</Label>
              <Input
                id="startsAt"
                v-model="startsAt"
                type="datetime-local"
                :min="earliestStart"
                required
              />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="endsAt">{{ t("eventForm.endsAt") }}</Label>
              <Input
                id="endsAt"
                v-model="endsAt"
                type="datetime-local"
                required
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="price">{{ t("eventForm.price") }}</Label>
              <Input
                id="price"
                v-model="priceInEuros"
                type="number"
                min="0"
                step="0.01"
                required
              />
              <p class="text-xs text-muted-foreground">
                {{ t("eventForm.priceHint") }}
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <Label for="capacity">{{ t("eventForm.capacity") }}</Label>
              <Input
                id="capacity"
                v-model="capacity"
                type="number"
                min="1"
                required
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <Label for="image">{{ t("eventForm.image") }}</Label>
            <input
              id="image"
              ref="imageInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              @change="selectImage"
            />
            <Button
              type="button"
              variant="outline"
              class="w-fit"
              data-testid="choose-image"
              :disabled="uploadImage.isPending.value"
              @click="openImagePicker"
            >
              <Upload class="size-4" />
              {{
                imageKey
                  ? t("eventForm.changeImage")
                  : t("eventForm.chooseImage")
              }}
            </Button>
            <p class="text-xs text-muted-foreground">
              {{ t("eventForm.imageHint") }}
            </p>
            <EventImage
              :image-url="imageUrl"
              :title="title"
              class="mt-2 aspect-video w-full rounded-md"
            />
            <p
              v-if="uploadImage.isPending.value"
              class="text-xs text-muted-foreground"
            >
              {{ t("eventForm.uploading") }}
            </p>
            <p
              v-else-if="imageKey"
              data-testid="image-ready"
              class="text-xs text-muted-foreground"
            >
              {{ t("eventForm.imageReady") }}
            </p>
          </div>

          <p
            v-if="errorMessage"
            data-testid="event-form-error"
            class="text-sm text-destructive"
          >
            {{ errorMessage }}
          </p>

          <Button
            type="submit"
            :disabled="saveEvent.isPending.value || uploadImage.isPending.value"
          >
            {{
              saveEvent.isPending.value
                ? t("eventForm.saving")
                : t("eventForm.save")
            }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
