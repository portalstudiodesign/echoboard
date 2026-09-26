import { describe, expect, it } from "vitest";
import { slugify, slugPattern } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["Acme Inc.", "acme-inc"],
    ["  Știință & Tehnică  ", "stiinta-tehnica"],
    ["---", ""],
    ["a".repeat(39) + " b", "a".repeat(39)],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("always produces slugs the validator accepts", () => {
    for (const name of ["Hello World", "Café Noir 2", "x-y-z"]) {
      expect(slugify(name)).toMatch(slugPattern);
    }
  });
});
