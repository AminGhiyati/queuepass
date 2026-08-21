import { describe, expect, it } from "vitest";
import EventCard from "@/components/EventCard.vue";
import { publicEvent } from "@/testing/eventFixtures";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

function mountCard(event = publicEvent()) {
  return mountWithPlugins(EventCard, { props: { event } });
}

describe("EventCard", () => {
  it("shows title, place and price", () => {
    const card = mountCard();

    expect(card.get('[data-testid="event-title"]').text()).toBe("Harbour Open Air");
    expect(card.text()).toContain("Hamburg");
    expect(card.get('[data-testid="event-price"]').text()).toContain("25.00");
  });

  it("names a free event free instead of showing a zero price", () => {
    const card = mountCard(publicEvent({ priceCents: 0 }));

    expect(card.get('[data-testid="event-price"]').text()).toBe("Free");
  });

  it("marks a sold out event", () => {
    const card = mountCard(publicEvent({ isSoldOut: true }));

    expect(card.text()).toContain("Sold out");
  });

  it("says nothing about availability while tickets are left", () => {
    const card = mountCard();

    expect(card.text()).not.toContain("Sold out");
  });

  it("links to the event detail page", () => {
    const card = mountCard();

    expect(card.getComponent({ name: "RouterLink" }).props("to")).toEqual({
      name: "eventDetail",
      params: { eventId: "event-id" },
    });
  });

  it("shows a placeholder picture when the event has none", () => {
    const card = mountCard(publicEvent({ imageUrl: null }));

    expect(card.find("img").exists()).toBe(false);
    expect(card.find('[data-testid="event-image-placeholder"]').exists()).toBe(true);
  });

  it("shows the picture of the event when it has one", () => {
    const card = mountCard(publicEvent({ imageUrl: "https://storage.test/events/poster.png" }));

    expect(card.get("img").attributes("src")).toBe("https://storage.test/events/poster.png");
    expect(card.find('[data-testid="event-image-placeholder"]').exists()).toBe(false);
  });
});
