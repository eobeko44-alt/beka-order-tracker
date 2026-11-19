import { describe, expect, it } from "vitest";
import { normalizeLocalPhone, toE164 } from "@/lib/phone";
import { validateReceipt, MAX_RECEIPT_BYTES } from "@/lib/receipts";
import { isValidWhatsapp, isValidPlayerId, normalizeTrackQuery, orderCodeFromId, toTrackStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/format";

describe("store rules", () => {
  it("accepts Sudanese phone numbers and converts them to +249", () => {
    expect(normalizeLocalPhone("0912345678")).toBe("0912345678");
    expect(normalizeLocalPhone("249912345678")).toBe("0912345678");
    expect(normalizeLocalPhone("12345")).toBeNull();
    expect(toE164("0912345678")).toBe("+249912345678");
  });

  it("limits receipts to JPG/PNG/WebP images up to 5 MB", () => {
    expect(MAX_RECEIPT_BYTES).toBe(5 * 1024 * 1024);
    const ok = new File([new Uint8Array(10)], "r.png", { type: "image/png" });
    const pdf = new File([new Uint8Array(10)], "r.pdf", { type: "application/pdf" });
    expect(validateReceipt(ok)).toBeNull();
    expect(validateReceipt(pdf)).not.toBeNull();
  });

  it("validates player ID length and WhatsApp number format", () => {
    expect(isValidPlayerId("12")).toBe(false);
    expect(isValidPlayerId("123")).toBe(true);
    expect(isValidWhatsapp("249912345678")).toBe(true);
    expect(isValidWhatsapp("09-12")).toBe(false);
  });

  it("shows prices in Sudanese pounds", () => {
    expect(formatPrice(11000)).toBe("11,000 ج.س");
  });
});

describe("order tracking", () => {
  it("uses the first 8 characters of the order id as the order number", () => {
    expect(orderCodeFromId("3f9a1c2b-1111-4222-8333-444455556666")).toBe("3F9A1C2B");
  });

  it("accepts an order number typed with # or BK- in front", () => {
    expect(normalizeTrackQuery("  #3F9A1C2B ")).toBe("3F9A1C2B");
    expect(normalizeTrackQuery("bk-3f9a1c2b")).toBe("3f9a1c2b");
    expect(normalizeTrackQuery("5123456789")).toBe("5123456789");
  });

  it("shows only three statuses: under review, shipped, rejected", () => {
    expect(toTrackStatus("pending")).toBe("pending");
    expect(toTrackStatus("confirmed")).toBe("completed");
    expect(toTrackStatus("completed")).toBe("completed");
    expect(toTrackStatus("rejected")).toBe("rejected");
  });
});
