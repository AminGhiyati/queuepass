export type EntranceClosure = "CANCELLED" | "ENDED";

type EventAtTheEntrance = {
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  hasEnded: boolean;
};

export function entranceClosureOf(event: EventAtTheEntrance | undefined): EntranceClosure | null {
  if (!event) {
    return null;
  }

  if (event.status === "CANCELLED") {
    return "CANCELLED";
  }

  return event.hasEnded ? "ENDED" : null;
}
