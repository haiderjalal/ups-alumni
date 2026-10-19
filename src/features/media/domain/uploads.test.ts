import { describe, expect, it } from "vitest";

import { detectUploadType, MAX_UPLOAD_BYTES, sanitizeFileName, validateUploadBytes } from "./uploads";

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");
const WEBP = new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const HTML = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
const SVG = new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>`);

describe("detectUploadType", () => {
  it("identifies accepted formats from their leading bytes", () => {
    expect(detectUploadType(JPEG)?.mimeType).toBe("image/jpeg");
    expect(detectUploadType(PNG)?.mimeType).toBe("image/png");
    expect(detectUploadType(PDF)?.mimeType).toBe("application/pdf");
    expect(detectUploadType(WEBP)?.mimeType).toBe("image/webp");
  });

  it("refuses markup and scripts even when they claim an image type", () => {
    expect(detectUploadType(HTML)).toBeNull();
    expect(detectUploadType(SVG)).toBeNull();
  });
});

describe("validateUploadBytes", () => {
  it("rejects empty files and files above the size limit", () => {
    expect(validateUploadBytes(new Uint8Array())).toEqual({ ok: false, reason: "EMPTY" });
    const tooLarge = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    tooLarge.set(JPEG, 0);
    expect(validateUploadBytes(tooLarge)).toEqual({ ok: false, reason: "TOO_LARGE" });
  });

  it("accepts a valid receipt image", () => {
    const result = validateUploadBytes(PNG);
    expect(result.ok).toBe(true);
  });
});

describe("sanitizeFileName", () => {
  it("strips paths and unsafe characters from browser-supplied names", () => {
    expect(sanitizeFileName("..\\..\\evil name<script>.png")).toBe("evil_name_script_.png");
    expect(sanitizeFileName("/etc/passwd")).toBe("passwd");
  });

  it("falls back to a neutral name when nothing usable remains", () => {
    expect(sanitizeFileName("...")).toBe("upload");
  });
});
