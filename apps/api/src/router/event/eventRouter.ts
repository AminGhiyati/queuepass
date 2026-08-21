import { createRouter } from "../../trpc/procedures.js";
import { cancelEvent } from "./cancelEvent.js";
import { createEvent } from "./createEvent.js";
import { createEventImageUploadUrl } from "./createEventImageUploadUrl.js";
import { deleteEvent } from "./deleteEvent.js";
import { getMyEvent } from "./getMyEvent.js";
import { getPublishedEvent } from "./getPublishedEvent.js";
import { listMyEvents } from "./listMyEvents.js";
import { listPublishedEvents } from "./listPublishedEvents.js";
import { publishEvent } from "./publishEvent.js";
import { updateEvent } from "./updateEvent.js";

export const eventRouter = createRouter({
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
  listMyEvents,
  getMyEvent,
  listPublishedEvents,
  getPublishedEvent,
  createEventImageUploadUrl,
});
