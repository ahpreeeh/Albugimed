import { describe, expect, it } from "vitest";
import { toLocalISOString } from "@/shared/lib/dates";

describe("toLocalISOString", () => {
  it("formats a date as YYYY-MM-DD using local time", () => {
    const date = new Date(2026, 3, 7); // April 7, 2026 local time
    expect(toLocalISOString(date)).toBe("2026-04-07");
  });

  it("pads single-digit months and days with zero", () => {
    const date = new Date(2026, 0, 3); // January 3, 2026 local time
    expect(toLocalISOString(date)).toBe("2026-01-03");
  });

  it("uses local time rather than UTC so late-evening dates are not shifted", () => {
    const date = new Date(2026, 11, 31, 23, 59, 0); // Dec 31, 2026 23:59 local
    expect(toLocalISOString(date)).toBe("2026-12-31");
  });
});
