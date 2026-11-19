import { describe, expect, it } from "vitest";
import { buildPhoneLoginMessage, isPhoneLoginEmail, phoneLoginEmail, PHONE_LOGIN_TTL_MINUTES } from "@/lib/phoneLogin";
import { isRequestOpen, type PhoneLoginRequest } from "@/lib/phoneLoginRequests";
import { buildWhatsAppUrl } from "@/lib/format";

const base: PhoneLoginRequest = {
  id: "r1",
  phone: "0912345678",
  code: "482913",
  status: "pending",
  createdAt: "2026-11-18T09:00:00Z",
  expiresAt: "2026-11-18T09:15:00Z",
  reviewedAt: null,
};

describe("WhatsApp phone login", () => {
  it("puts the customer's number and the code in the WhatsApp message to the store", () => {
    const message = buildPhoneLoginMessage("0912345678", "482913");
    expect(message).toContain("0912345678");
    expect(message).toContain("482913");
    const url = buildWhatsAppUrl(message);
    expect(url.startsWith("https://wa.me/249114071454?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1] ?? "")).toBe(message);
  });

  it("gives codes 15 minutes", () => {
    expect(PHONE_LOGIN_TTL_MINUTES).toBe(15);
  });

  it("only lets owners approve pending, unexpired requests", () => {
    const before = new Date("2026-11-18T09:10:00Z").getTime();
    const after = new Date("2026-11-18T09:16:00Z").getTime();
    expect(isRequestOpen(base, before)).toBe(true);
    expect(isRequestOpen(base, after)).toBe(false);
    expect(isRequestOpen({ ...base, status: "used" }, before)).toBe(false);
    expect(isRequestOpen({ ...base, status: "rejected" }, before)).toBe(false);
  });

  it("hides the internal sign-in address used for phone accounts", () => {
    const email = phoneLoginEmail("0912345678");
    expect(email).toBe("p249912345678@phone.beka-store.app");
    expect(isPhoneLoginEmail(email)).toBe(true);
    expect(isPhoneLoginEmail("someone@gmail.com")).toBe(false);
  });
});
