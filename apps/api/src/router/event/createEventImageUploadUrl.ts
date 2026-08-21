import { z } from "zod";
import { createEventImageUpload } from "../../lib/storage/eventImages.js";
import { organizerProcedure } from "../../trpc/procedures.js";
import { imageContentTypeInput } from "./eventInput.js";

export const createEventImageUploadUrl = organizerProcedure
  .input(z.object({ contentType: imageContentTypeInput }))
  .mutation(({ input }) => createEventImageUpload(input.contentType));
