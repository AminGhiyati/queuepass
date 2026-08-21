import { describe, expect, it } from "vitest";
import EventImage from "@/components/EventImage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

function mountImage(imageUrl: string | null) {
  return mountWithPlugins(EventImage, { props: { imageUrl, title: "Harbour Open Air" } });
}

describe("EventImage", () => {
  it("shows the uploaded picture of the event", () => {
    const image = mountImage("https://storage.test/events/poster.png");

    expect(image.get("img").attributes("src")).toBe("https://storage.test/events/poster.png");
    expect(image.get("img").attributes("alt")).toBe("Harbour Open Air");
  });

  it("shows a placeholder instead when the event has no picture", () => {
    const image = mountImage(null);

    expect(image.find("img").exists()).toBe(false);
    expect(image.find('[data-testid="event-image-placeholder"]').exists()).toBe(true);
  });

  it("keeps no placeholder next to an uploaded picture", () => {
    const image = mountImage("https://storage.test/events/poster.png");

    expect(image.find('[data-testid="event-image-placeholder"]').exists()).toBe(false);
  });
});
