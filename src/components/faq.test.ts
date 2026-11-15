import { describe, expect, it } from "vitest";
import { nextFaqOpen } from "@/components/faq";

describe("nextFaqOpen", () => {
  it("starts from the first item and closes it when tapped again", () => {
    expect(nextFaqOpen(0, 0)).toBeNull();
  });

  it("opens one item and closes the one that was open", () => {
    expect(nextFaqOpen(0, 2)).toBe(2);
    expect(nextFaqOpen(2, 4)).toBe(4);
  });

  it("closes the open item without opening another", () => {
    expect(nextFaqOpen(4, 4)).toBeNull();
    expect(nextFaqOpen(null, 1)).toBe(1);
  });
});
