<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { ArrowLeft, Camera, CameraOff } from "lucide-vue-next";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { entranceClosureOf } from "@/lib/eventEntrance";
import { formatDateTime } from "@/lib/formatEvent";
import { trpc } from "@/lib/trpcClient";

type ScanReport = Awaited<ReturnType<typeof trpc.checkIn.checkInTicket.mutate>>;

const { t, locale } = useI18n();
const route = useRoute();
const queryClient = useQueryClient();

const eventId = computed(() => String(route.params.eventId));
const videoElement = useTemplateRef<HTMLVideoElement>("video");

const lastResult = ref<ScanReport | null>(null);
const isCheckingCode = ref(false);
const isCameraRunning = ref(false);
const isCameraStarting = ref(false);
const cameraFailure = ref<"denied" | "insecure" | "unavailable" | null>(null);
const previewAspectRatio = ref("16 / 9");
const errorMessage = ref("");

let cameraScanner: { stop: () => void; destroy: () => void } | null = null;
let cameraIsWanted = false;

const event = useQuery({
  queryKey: ["myEvent", eventId],
  queryFn: () => trpc.event.getMyEvent.query({ eventId: eventId.value }),
});

const entranceClosure = computed(() => entranceClosureOf(event.data.value));
const hasScanned = computed(
  () => lastResult.value !== null || errorMessage.value !== "",
);

async function checkCode(code: string) {
  if (isCheckingCode.value || hasScanned.value) {
    return;
  }

  isCheckingCode.value = true;
  stopCamera();

  try {
    lastResult.value = await trpc.checkIn.checkInTicket.mutate({
      eventId: eventId.value,
      code,
    });
    void queryClient.invalidateQueries({
      queryKey: ["eventTickets", eventId.value],
    });
  } catch {
    errorMessage.value = t("scanner.checkFailed");
  } finally {
    isCheckingCode.value = false;
  }
}

async function scanNextTicket() {
  lastResult.value = null;
  errorMessage.value = "";
  await nextTick();
  await startCamera();
}

function failureReason(failure: unknown) {
  if (failure instanceof DOMException && failure.name === "NotAllowedError") {
    return "denied" as const;
  }

  return window.isSecureContext
    ? ("unavailable" as const)
    : ("insecure" as const);
}

async function startCamera() {
  if (isCameraRunning.value || isCameraStarting.value) {
    return;
  }

  cameraFailure.value = null;
  cameraIsWanted = true;
  isCameraStarting.value = true;

  try {
    const { default: QrScanner } = await import("qr-scanner");
    const video = videoElement.value;

    if (!video) {
      throw new Error("NO_VIDEO_ELEMENT");
    }

    const scanner = new QrScanner(
      video,
      (result) => void checkCode(result.data),
      {
        highlightScanRegion: true,
        maxScansPerSecond: 2,
      },
    );

    await scanner.start();
    cameraScanner = scanner;
    isCameraRunning.value = true;

    if (!cameraIsWanted) {
      stopCamera();
    }
  } catch (failure) {
    cameraFailure.value = failureReason(failure);
    isCameraRunning.value = false;
  } finally {
    isCameraStarting.value = false;
  }
}

function stopCamera() {
  cameraIsWanted = false;
  cameraScanner?.stop();
  cameraScanner?.destroy();
  cameraScanner = null;
  isCameraRunning.value = false;
}

function fitPreviewToCameraPicture() {
  const video = videoElement.value;

  if (!video?.videoWidth || !video.videoHeight) {
    return;
  }

  previewAspectRatio.value = `${video.videoWidth} / ${video.videoHeight}`;
}

const cameraStatus = computed(() => {
  if (cameraFailure.value) {
    return t(`scanner.camera.${cameraFailure.value}`);
  }
  if (isCheckingCode.value) {
    return t("scanner.camera.checking");
  }

  return isCameraStarting.value
    ? t("scanner.camera.starting")
    : t("scanner.camera.off");
});

onMounted(() => {
  void startCamera();
});

watch(entranceClosure, (closure) => {
  if (closure) {
    stopCamera();
  }
});

onBeforeUnmount(stopCamera);
</script>

<template>
  <main class="mx-auto max-w-lg px-6 py-10">
    <RouterLink
      :to="{ name: 'organizerEvents' }"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      {{ t("scanner.back") }}
    </RouterLink>

    <h1 class="mt-6 text-3xl font-semibold tracking-tight">
      {{ t("scanner.title") }}
    </h1>
    <p class="mt-2 text-muted-foreground">
      {{ t("scanner.description", { event: event.data.value?.title ?? "" }) }}
    </p>

    <p
      v-if="entranceClosure"
      data-testid="scanner-entrance-closed"
      class="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ t(`scanner.entranceClosed.${entranceClosure}`) }}
    </p>

    <Card v-if="!entranceClosure && !hasScanned" class="mt-6">
      <CardContent class="flex flex-col gap-4 p-5">
        <div
          data-testid="camera-frame"
          class="relative max-h-[60svh] w-full overflow-hidden rounded-md bg-muted"
          :style="{ aspectRatio: previewAspectRatio }"
        >
          <video
            ref="video"
            data-testid="camera-preview"
            class="size-full object-contain"
            @loadedmetadata="fitPreviewToCameraPicture"
          />
          <div
            v-if="!isCameraRunning"
            data-testid="camera-cover"
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted px-6 text-center"
          >
            <CameraOff class="size-6 text-muted-foreground" />
            <p
              data-testid="camera-status"
              class="text-sm"
              :class="
                cameraFailure ? 'text-destructive' : 'text-muted-foreground'
              "
            >
              {{ cameraStatus }}
            </p>
          </div>
        </div>

        <Button
          v-if="isCameraRunning"
          data-testid="stop-camera"
          variant="outline"
          size="sm"
          @click="stopCamera"
        >
          <CameraOff class="size-4" />
          {{ t("scanner.stopCamera") }}
        </Button>
        <Button
          v-else
          data-testid="start-camera"
          variant="outline"
          size="sm"
          :disabled="isCameraStarting"
          @click="startCamera"
        >
          <Camera class="size-4" />
          {{ t("scanner.startCamera") }}
        </Button>
      </CardContent>
    </Card>

    <Card
      v-if="lastResult"
      class="mt-4"
      :class="
        lastResult.outcome === 'CHECKED_IN'
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : 'border-destructive/50 bg-destructive/5'
      "
    >
      <CardContent class="flex flex-col gap-1 p-5">
        <p data-testid="scan-outcome" class="font-semibold">
          {{ t(`scanner.outcome.${lastResult.outcome}`) }}
        </p>
        <p
          v-if="lastResult.buyerName"
          data-testid="scan-holder"
          class="text-sm"
        >
          {{ t("scanner.holder", { name: lastResult.buyerName }) }}
        </p>
        <p
          v-if="
            lastResult.outcome === 'ALREADY_CHECKED_IN' &&
            lastResult.checkedInAt
          "
          data-testid="scan-used-at"
          class="text-sm text-muted-foreground"
        >
          {{
            t("scanner.usedAt", {
              when: formatDateTime(lastResult.checkedInAt, locale),
            })
          }}
        </p>
        <p class="font-mono text-xs break-all text-muted-foreground">
          {{ lastResult.code }}
        </p>
      </CardContent>
    </Card>

    <p
      v-if="errorMessage"
      data-testid="scanner-error"
      class="mt-4 text-sm text-destructive"
    >
      {{ errorMessage }}
    </p>

    <Button
      v-if="hasScanned"
      data-testid="scan-next-ticket"
      class="mt-4 w-full"
      :disabled="isCameraStarting"
      @click="scanNextTicket"
    >
      <Camera class="size-4" />
      {{ t("scanner.nextTicket") }}
    </Button>
  </main>
</template>
