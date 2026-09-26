import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/forms";

describe("safeReturnTo", () => {
  it("keeps same-site paths", () => {
    expect(safeReturnTo("/invite/abc?x=1")).toBe("/invite/abc?x=1");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "invite", undefined, null])(
    "falls back for %s",
    (value) => {
      expect(safeReturnTo(value)).toBe("/dashboard");
    },
  );
});
