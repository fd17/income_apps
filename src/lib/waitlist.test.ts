import { describe, expect, it } from "vitest";

import { addEmail, isValidEmail, normalizeEmail } from "./waitlist";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });
});

describe("isValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidEmail("jane.doe@example.com")).toBe(true);
  });

  it.each(["", "no-at", "a@b", "a@b.", "foo @bar.com", "x".repeat(255) + "@a.com"])(
    "rejects %j",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});

describe("addEmail", () => {
  it("appends a new email and reports its position", () => {
    const result = addEmail(["a@x.com"], "b@x.com");
    expect(result.added).toBe(true);
    expect(result.emails).toEqual(["a@x.com", "b@x.com"]);
    expect(result.position).toBe(2);
    expect(result.total).toBe(2);
  });

  it("de-duplicates case-insensitively without mutating the list", () => {
    const original = ["a@x.com"];
    const result = addEmail(original, "A@X.com");
    expect(result.added).toBe(false);
    expect(result.position).toBe(1);
    expect(result.emails).toBe(original);
    expect(original).toEqual(["a@x.com"]);
  });
});
