import { crc32, deflateSync } from "node:zlib";

const BACKGROUND_COLOR = [15, 23, 42];
const MARK_COLOR = [255, 255, 255];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BIT_DEPTH = 8;
const TRUECOLOUR = 2;

function pngChunk(type: string, payload: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);

  const typeAndPayload = Buffer.concat([Buffer.from(type, "ascii"), payload]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndPayload));

  return Buffer.concat([length, typeAndPayload, checksum]);
}

function imageHeader(size: number) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(BIT_DEPTH, 8);
  header.writeUInt8(TRUECOLOUR, 9);

  return header;
}

function isInsideMark(x: number, y: number, size: number) {
  const horizontalOffset = x + 0.5 - size / 2;
  const verticalOffset = y + 0.5 - size / 2;
  const distanceFromCenter = Math.hypot(horizontalOffset, verticalOffset);
  const isRing =
    distanceFromCenter >= size * 0.22 && distanceFromCenter <= size * 0.34;
  const isTailOfTheQ =
    horizontalOffset > 0 &&
    verticalOffset > 0 &&
    Math.abs(horizontalOffset - verticalOffset) <= size * 0.06 &&
    distanceFromCenter >= size * 0.22 &&
    distanceFromCenter <= size * 0.44;

  return isRing || isTailOfTheQ;
}

export function renderQueuePassMarkPng(size: number) {
  const rows: Buffer[] = [];

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);

    for (let x = 0; x < size; x++) {
      row.set(
        isInsideMark(x, y, size) ? MARK_COLOR : BACKGROUND_COLOR,
        1 + x * 3,
      );
    }

    rows.push(row);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", imageHeader(size)),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
