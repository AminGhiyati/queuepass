import { describe, expect, it } from "vitest";
import { renderQueuePassMarkPng } from "./passArtwork.js";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("renderQueuePassMarkPng", () => {
  it("writes a png that a reader recognises by its signature", () => {
    const icon = renderQueuePassMarkPng(29);

    expect(icon.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  });

  it("writes the asked for size into the image header", () => {
    const icon = renderQueuePassMarkPng(58);
    const imageHeader = icon.subarray(16, 24);

    expect(imageHeader.readUInt32BE(0)).toBe(58);
    expect(imageHeader.readUInt32BE(4)).toBe(58);
  });

  it("ends the file with the IEND chunk", () => {
    const icon = renderQueuePassMarkPng(29);

    expect(icon.subarray(icon.length - 8, icon.length - 4).toString("ascii")).toBe("IEND");
  });
});
