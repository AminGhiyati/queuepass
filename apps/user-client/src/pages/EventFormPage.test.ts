import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventFormPage from "@/pages/EventFormPage.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { createEvent, updateEvent, getMyEvent, navigateTo, routeParams } = vi.hoisted(() => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  getMyEvent: vi.fn(),
  navigateTo: vi.fn(),
  routeParams: {} as Record<string, string>,
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: {
    event: {
      createEvent: { mutate: createEvent },
      updateEvent: { mutate: updateEvent },
      getMyEvent: { query: getMyEvent },
      createEventImageUploadUrl: { mutate: vi.fn() },
    },
  },
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: navigateTo }),
  useRoute: () => ({ params: routeParams }),
}));

const filledInEvent = {
  title: "Harbour Open Air",
  description: "One night, three stages.",
  location: "Hamburg",
  startsAt: "2030-09-01T18:00",
  endsAt: "2030-09-02T02:00",
  priceInEuros: "25",
  capacity: "400",
};

async function fillAndSubmit(
  page: ReturnType<typeof mountWithPlugins>,
  overrides: Partial<typeof filledInEvent> = {},
) {
  const values = { ...filledInEvent, ...overrides };

  await page.find("#title").setValue(values.title);
  await page.find("#description").setValue(values.description);
  await page.find("#location").setValue(values.location);
  await page.find("#startsAt").setValue(values.startsAt);
  await page.find("#endsAt").setValue(values.endsAt);
  await page.find("#price").setValue(values.priceInEuros);
  await page.find("#capacity").setValue(values.capacity);
  await page.find("form").trigger("submit");
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(routeParams)) {
    delete routeParams[key];
  }
});

describe("EventFormPage when creating", () => {
  it("sends the filled in event to the server", async () => {
    createEvent.mockResolvedValue(publicEvent());

    await fillAndSubmit(mountWithPlugins(EventFormPage));

    expect(createEvent).toHaveBeenCalledWith({
      title: "Harbour Open Air",
      description: "One night, three stages.",
      location: "Hamburg",
      startsAt: new Date("2030-09-01T18:00"),
      endsAt: new Date("2030-09-02T02:00"),
      priceCents: 2500,
      capacity: 400,
      imageKey: null,
    });
  });

  it("turns euros into whole cents", async () => {
    createEvent.mockResolvedValue(publicEvent());

    await fillAndSubmit(mountWithPlugins(EventFormPage), { priceInEuros: "25.10" });

    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ priceCents: 2510 }));
  });

  it("accepts a free event", async () => {
    createEvent.mockResolvedValue(publicEvent());

    await fillAndSubmit(mountWithPlugins(EventFormPage), { priceInEuros: "0" });

    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ priceCents: 0 }));
  });

  it("returns to the event list after saving", async () => {
    createEvent.mockResolvedValue(publicEvent());

    await fillAndSubmit(mountWithPlugins(EventFormPage));

    expect(navigateTo).toHaveBeenCalledWith({ name: "organizerEvents" });
  });

  it("lets no event start before now", async () => {
    const page = mountWithPlugins(EventFormPage);

    const earliestStart = page.find<HTMLInputElement>("#startsAt").element.min;

    expect(new Date(earliestStart).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(earliestStart).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it("explains a start date the server saw as past", async () => {
    createEvent.mockRejectedValue(new Error("EVENT_STARTS_IN_THE_PAST"));

    const page = mountWithPlugins(EventFormPage);
    await fillAndSubmit(page);

    expect(page.get('[data-testid="event-form-error"]').text()).toBe(
      "The event has to start in the future.",
    );
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("opens the file picker from the upload button", async () => {
    const page = mountWithPlugins(EventFormPage);
    const openPicker = vi.spyOn(page.find<HTMLInputElement>("#image").element, "click");

    await page.get('[data-testid="choose-image"]').trigger("click");

    expect(openPicker).toHaveBeenCalledOnce();
  });

  it("explains an end date that lies before the start", async () => {
    createEvent.mockRejectedValue(new Error("endsAt: An event has to end after it starts."));

    const page = mountWithPlugins(EventFormPage);
    await fillAndSubmit(page);

    expect(page.get('[data-testid="event-form-error"]').text()).toBe(
      "The event has to end after it starts.",
    );
    expect(navigateTo).not.toHaveBeenCalled();
  });
});

describe("EventFormPage when editing", () => {
  it("loads the event named in the route into the form", async () => {
    routeParams.eventId = "event-id";
    getMyEvent.mockResolvedValue(publicEvent({ title: "Winter Jazz", priceCents: 1250 }));

    const page = mountWithPlugins(EventFormPage);
    await flushPromises();

    expect(getMyEvent).toHaveBeenCalledWith({ eventId: "event-id" });
    expect(page.find<HTMLInputElement>("#title").element.value).toBe("Winter Jazz");
    expect(page.find<HTMLInputElement>("#price").element.value).toBe("12.5");
  });

  it("shows no form before the event arrived, so typing cannot be overwritten", async () => {
    routeParams.eventId = "event-id";
    getMyEvent.mockReturnValue(new Promise(() => {}));

    const page = mountWithPlugins(EventFormPage);
    await flushPromises();

    expect(page.find("#title").exists()).toBe(false);
    expect(page.text()).toContain("Loading the event…");
  });

  it("updates instead of creating a second event", async () => {
    routeParams.eventId = "event-id";
    getMyEvent.mockResolvedValue(publicEvent());
    updateEvent.mockResolvedValue(publicEvent());

    const page = mountWithPlugins(EventFormPage);
    await flushPromises();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "event-id" }),
    );
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("keeps the existing image when only the text changes", async () => {
    routeParams.eventId = "event-id";
    getMyEvent.mockResolvedValue(publicEvent({ imageKey: "events/abc.png" }));
    updateEvent.mockResolvedValue(publicEvent());

    const page = mountWithPlugins(EventFormPage);
    await flushPromises();
    await page.find("#title").setValue("Winter Jazz");
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ imageKey: "events/abc.png" }),
      }),
    );
  });

  it("keeps the start date of an event that has already started editable", async () => {
    routeParams.eventId = "event-id";
    const startedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    getMyEvent.mockResolvedValue(publicEvent({ startsAt: startedYesterday }));

    const page = mountWithPlugins(EventFormPage);
    await flushPromises();

    expect(page.find<HTMLInputElement>("#startsAt").element.min).toBe("");
  });

  it("explains a capacity below the tickets already sold", async () => {
    routeParams.eventId = "event-id";
    getMyEvent.mockResolvedValue(publicEvent());
    updateEvent.mockRejectedValue(new Error("CAPACITY_BELOW_SOLD_TICKETS"));

    const page = mountWithPlugins(EventFormPage);
    await flushPromises();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(page.get('[data-testid="event-form-error"]').text()).toBe(
      "The capacity cannot be lower than the tickets already sold.",
    );
  });

  it("explains a paid price below the chargeable minimum", async () => {
    routeParams.eventId = "event-id";
    getMyEvent.mockResolvedValue(publicEvent());
    updateEvent.mockRejectedValue(new Error("PRICE_BELOW_MINIMUM"));

    const page = mountWithPlugins(EventFormPage);
    await flushPromises();
    await page.find("form").trigger("submit");
    await flushPromises();

    expect(page.get('[data-testid="event-form-error"]').text()).toBe(
      "A paid ticket has to cost at least 0.50 euros.",
    );
  });
});
