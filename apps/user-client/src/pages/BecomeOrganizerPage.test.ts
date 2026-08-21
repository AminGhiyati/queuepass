import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BecomeOrganizerPage from "@/pages/BecomeOrganizerPage.vue";
import { mountWithPlugins } from "@/testing/mountWithPlugins";

const { becomeOrganizer, navigateTo } = vi.hoisted(() => ({
  becomeOrganizer: vi.fn(),
  navigateTo: vi.fn(),
}));

vi.mock("@/lib/trpcClient", () => ({
  trpc: { user: { becomeOrganizer: { mutate: becomeOrganizer } } },
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: navigateTo }) }));

beforeEach(() => vi.clearAllMocks());

describe("BecomeOrganizerPage", () => {
  it("explains what an organizer account gets", () => {
    const page = mountWithPlugins(BecomeOrganizerPage);

    expect(page.text()).toContain("Host your own events");
    expect(page.text()).toContain("Publish an event in minutes");
  });

  it("grants organizer access and opens the organizer area", async () => {
    becomeOrganizer.mockResolvedValue({ role: "ORGANIZER" });

    const page = mountWithPlugins(BecomeOrganizerPage);
    await page.get('[data-testid="confirm-become-organizer"]').trigger("click");
    await flushPromises();

    expect(becomeOrganizer).toHaveBeenCalledOnce();
    expect(navigateTo).toHaveBeenCalledWith({ name: "organizerEvents" });
  });

  it("reports a refused upgrade instead of pretending it worked", async () => {
    becomeOrganizer.mockRejectedValue(new Error("FORBIDDEN"));

    const page = mountWithPlugins(BecomeOrganizerPage);
    await page.get('[data-testid="confirm-become-organizer"]').trigger("click");
    await flushPromises();

    expect(page.get('[data-testid="become-organizer-error"]').text()).toContain(
      "could not be granted",
    );
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it("blocks a second press while the upgrade runs", async () => {
    becomeOrganizer.mockReturnValue(new Promise(() => {}));

    const page = mountWithPlugins(BecomeOrganizerPage);
    await page.get('[data-testid="confirm-become-organizer"]').trigger("click");

    expect(page.get('[data-testid="confirm-become-organizer"]').attributes("disabled")).toBeDefined();
  });
});
