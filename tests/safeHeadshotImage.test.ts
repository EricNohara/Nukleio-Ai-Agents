import { afterEach, describe, expect, it } from "vitest";
import { isPublicAddress, validateStorageImageUrl } from "../apps/professionalHeadshotAgent/src/utils/safeHeadshotImage";

const userId = "4c4b6f86-a94f-48dc-93a0-171938d0db43";
const base = "https://example.supabase.co/storage/v1/object/public/professional_headshots";
afterEach(() => { delete process.env.SUPABASE_URL; delete process.env.SUPABASE_HEADSHOT_BUCKET; });

describe("headshot image destinations", () => {
  it("accepts only the user's expected storage paths", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    expect(validateStorageImageUrl(`${base}/generated/${userId}/headshot-123-abc.webp`, userId, "generated").hostname).toBe("example.supabase.co");
    expect(validateStorageImageUrl(`${base}/inputs/${userId}/reference-123.png`, userId, "inputs").hostname).toBe("example.supabase.co");
    for (const url of [
      `https://evil.example/storage/v1/object/public/professional_headshots/generated/${userId}/headshot-123.webp`,
      `${base}/generated/other-user/headshot-123.webp`,
      `${base}/generated/${userId}/headshot-123.webp?x=1`,
      `${base}/generated/${userId}/%2e%2e/headshot-123.webp`,
      `http://example.supabase.co/storage/v1/object/public/professional_headshots/generated/${userId}/headshot-123.webp`,
    ]) expect(() => validateStorageImageUrl(url, userId, "generated")).toThrow();
  });

  it("rejects private, metadata, loopback, mapped and documentation addresses", () => {
    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "100.64.0.1", "::1", "::ffff:127.0.0.1", "fe80::1", "fc00::1", "2001:db8::1", "2002:7f00:1::1"]) expect(isPublicAddress(address)).toBe(false);
    expect(isPublicAddress("1.1.1.1")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
});
