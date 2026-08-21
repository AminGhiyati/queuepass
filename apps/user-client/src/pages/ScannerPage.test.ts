import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScannerPage from "@/pages/ScannerPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { getMyEvent, checkInTicket } = vi.hoisted(() => ({
  getMyEvent: vi.fn(),
  checkInTicket: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    event: { getMyEvent: { query: getMyEvent } },
    checkIn: { checkInTicket: { mutate: checkInTicket } },
  },
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { eventId: "event-id" } }),
}));

const {
  startScanner,
  stopScanner,
  destroyScanner,
  decodedCodes,
  videoClassesAtConstruction,
} = vi.hoisted(() => ({
  startScanner: vi.fn(),
  stopScanner: vi.fn(),
  destroyScanner: vi.fn(),
  decodedCodes: [] as ((result: { data: string }) => void)[],
  videoClassesAtConstruction: [] as string[],
}));

vi.mock("qr-scanner", () => ({
  default: class {
    start = startScanner;
    stop = stopScanner;
    destroy = destroyScanner;

    constructor(
      video: HTMLVideoElement,
      onDecoded: (result: { data: string }) => void,
    ) {
      videoClassesAtConstruction.push(video.className);
      decodedCodes.push(onDecoded);
    }
  },
}));

async function mountScanner(event = publicEvent()) {
  getMyEvent.mockResolvedValue({ ...event, imageKey: null });

  const page = mountWithPlugins(ScannerPage);
  await flushPromises();
  await flushPromises();

  return page;
}

type ScannerPageWrapper = Awaited<ReturnType<typeof mountScanner>>;

async function holdCodeIntoCamera(code: string) {
  decodedCodes[decodedCodes.length - 1]?.({ data: code });
  await flushPromises();
}

async function reportCameraPicture(
  page: ScannerPageWrapper,
  picture: { width: number; height: number },
) {
  const preview = page.get('[data-testid="camera-preview"]');

  Object.defineProperty(preview.element, "videoWidth", {
    value: picture.width,
  });
  Object.defineProperty(preview.element, "videoHeight", {
    value: picture.height,
  });
  await preview.trigger("loadedmetadata");
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  decodedCodes.length = 0;
  videoClassesAtConstruction.length = 0;
  startScanner.mockResolvedValue(undefined);
});

describe("ScannerPage of an event nobody can enter", () => {
  function expectNoWayToScan(page: ScannerPageWrapper) {
    expect(page.find('[data-testid="start-camera"]').exists()).toBe(false);
    expect(page.find('[data-testid="camera-preview"]').exists()).toBe(false);
    expect(page.find('[data-testid="stop-camera"]').exists()).toBe(false);
  }

  it("closes the entrance of an event that is over instead of scanning", async () => {
    const page = await mountScanner(publicEvent({ hasEnded: true }));

    expect(
      page.get('[data-testid="scanner-entrance-closed"]').text(),
    ).toContain("This event is over");
    expectNoWayToScan(page);
  });

  it("closes the entrance of a cancelled event whose date is still ahead", async () => {
    const page = await mountScanner(publicEvent({ status: "CANCELLED" }));

    expect(
      page.get('[data-testid="scanner-entrance-closed"]').text(),
    ).toContain("This event is cancelled");
    expectNoWayToScan(page);
  });
});

describe("ScannerPage camera", () => {
  it("shows the camera picture as soon as the entrance opens", async () => {
    const page = await mountScanner();

    expect(startScanner).toHaveBeenCalled();
    expect(page.find('[data-testid="camera-cover"]').exists()).toBe(false);
    expect(page.find('[data-testid="stop-camera"]').exists()).toBe(true);
  });

  it("hands the camera a video that is not hidden while the camera is still off", async () => {
    await mountScanner();

    expect(videoClassesAtConstruction).toEqual([
      expect.not.stringContaining("invisible"),
    ]);
  });

  it("takes the shape of the camera picture so the scan marking stays inside the preview", async () => {
    const page = await mountScanner();

    await reportCameraPicture(page, { width: 720, height: 1280 });

    expect(
      page.get('[data-testid="camera-frame"]').attributes("style"),
    ).toContain("aspect-ratio: 720 / 1280");
  });

  it("keeps a wide preview until the camera reports the shape of its picture", async () => {
    const page = await mountScanner();

    expect(
      page.get('[data-testid="camera-frame"]').attributes("style"),
    ).toContain("aspect-ratio: 16 / 9");
  });

  it("stops the camera when the entrance is closed and starts it again on demand", async () => {
    const page = await mountScanner();

    await page.get('[data-testid="stop-camera"]').trigger("click");

    expect(stopScanner).toHaveBeenCalled();
    expect(destroyScanner).toHaveBeenCalled();
    expect(page.get('[data-testid="camera-status"]').text()).toContain(
      "Camera is off",
    );

    await page.get('[data-testid="start-camera"]').trigger("click");
    await flushPromises();

    expect(page.find('[data-testid="camera-cover"]').exists()).toBe(false);
  });

  it("says that the camera was denied instead of showing an empty picture", async () => {
    startScanner.mockRejectedValue(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    const page = await mountScanner();

    expect(page.get('[data-testid="camera-status"]').text()).toContain(
      "denied",
    );
    expect(page.find('[data-testid="camera-cover"]').exists()).toBe(true);
  });

  it("names https as the reason when the entrance is opened over the network", async () => {
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
    });
    startScanner.mockRejectedValue(new Error("Camera not found."));

    const page = await mountScanner();

    expect(page.get('[data-testid="camera-status"]').text()).toContain("https");

    Object.defineProperty(window, "isSecureContext", {
      value: true,
      configurable: true,
    });
  });
});

describe("ScannerPage scanning one ticket at a time", () => {
  function letTicketIn(code: string) {
    checkInTicket.mockResolvedValue({
      code,
      outcome: "CHECKED_IN",
      checkedInAt: new Date("2026-09-01T18:10:00.000Z"),
      buyerName: "Anna Becker",
    });
  }

  it("takes the camera out of the page with the first read and shows the outcome", async () => {
    letTicketIn("valid");

    const page = await mountScanner();
    await holdCodeIntoCamera("valid");

    expect(stopScanner).toHaveBeenCalled();
    expect(destroyScanner).toHaveBeenCalled();
    expect(page.get('[data-testid="scan-outcome"]').text()).toBe("Let in");
    expect(page.find('[data-testid="camera-frame"]').exists()).toBe(false);
    expect(page.find('[data-testid="camera-status"]').exists()).toBe(false);
    expect(page.find('[data-testid="stop-camera"]').exists()).toBe(false);
    expect(page.find('[data-testid="start-camera"]').exists()).toBe(false);
  });

  it("checks a ticket once even when the camera reads it again", async () => {
    letTicketIn("valid");

    await mountScanner();
    await holdCodeIntoCamera("valid");
    await holdCodeIntoCamera("valid");

    expect(checkInTicket).toHaveBeenCalledTimes(1);
  });

  it("starts the camera again for the next ticket and clears the outcome", async () => {
    letTicketIn("valid");

    const page = await mountScanner();
    await holdCodeIntoCamera("valid");

    await page.get('[data-testid="scan-next-ticket"]').trigger("click");
    await flushPromises();

    expect(page.find('[data-testid="scan-outcome"]').exists()).toBe(false);
    expect(page.find('[data-testid="scan-next-ticket"]').exists()).toBe(false);
    expect(page.find('[data-testid="camera-frame"]').exists()).toBe(true);
    expect(page.find('[data-testid="camera-cover"]').exists()).toBe(false);
    expect(startScanner).toHaveBeenCalledTimes(2);
  });

  it("switches the camera off and offers the next ticket when the check fails", async () => {
    checkInTicket.mockRejectedValue(new Error("offline"));

    const page = await mountScanner();
    await holdCodeIntoCamera("valid");

    expect(stopScanner).toHaveBeenCalled();
    expect(page.get('[data-testid="scanner-error"]').text()).toContain(
      "could not be checked",
    );
    expect(page.find('[data-testid="scan-next-ticket"]').exists()).toBe(true);
    expect(page.find('[data-testid="camera-frame"]').exists()).toBe(false);
  });

  it("clears a failed check when the next ticket is scanned", async () => {
    checkInTicket.mockRejectedValueOnce(new Error("offline"));

    const page = await mountScanner();
    await holdCodeIntoCamera("valid");

    letTicketIn("second");
    await page.get('[data-testid="scan-next-ticket"]').trigger("click");
    await flushPromises();
    await holdCodeIntoCamera("second");

    expect(page.find('[data-testid="scanner-error"]').exists()).toBe(false);
    expect(page.get('[data-testid="scan-outcome"]').text()).toBe("Let in");
  });

  it("lets a valid ticket in and names its holder", async () => {
    checkInTicket.mockResolvedValue({
      code: "valid",
      outcome: "CHECKED_IN",
      checkedInAt: new Date("2026-09-01T18:10:00.000Z"),
      buyerName: "Anna Becker",
    });

    const page = await mountScanner();
    await holdCodeIntoCamera("valid");

    expect(checkInTicket).toHaveBeenCalledWith({
      eventId: "event-id",
      code: "valid",
    });
    expect(page.get('[data-testid="scan-outcome"]').text()).toBe("Let in");
    expect(page.get('[data-testid="scan-holder"]').text()).toBe(
      "Ticket of Anna Becker",
    );
  });

  it("says when a ticket was already used", async () => {
    checkInTicket.mockResolvedValue({
      code: "valid",
      outcome: "ALREADY_CHECKED_IN",
      checkedInAt: new Date(2026, 8, 1, 18, 5),
      buyerName: "Anna Becker",
    });

    const page = await mountScanner();
    await holdCodeIntoCamera("valid");

    expect(page.get('[data-testid="scan-outcome"]').text()).toBe(
      "Already used",
    );
    expect(page.get('[data-testid="scan-used-at"]').text()).toContain("Used");
  });

  it("refuses a code that belongs to nothing", async () => {
    checkInTicket.mockResolvedValue({
      code: "nonsense",
      outcome: "UNKNOWN_CODE",
      checkedInAt: null,
      buyerName: null,
    });

    const page = await mountScanner();
    await holdCodeIntoCamera("nonsense");

    expect(page.get('[data-testid="scan-outcome"]').text()).toBe(
      "Unknown ticket",
    );
    expect(page.find('[data-testid="scan-holder"]').exists()).toBe(false);
  });
});
