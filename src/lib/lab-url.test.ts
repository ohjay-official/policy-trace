import { describe, expect, it } from "vitest";
import { labSearch } from "@/lib/lab-url";

describe("labSearch", () => {
  it("keeps the identity and chip, and a share id already in the url", () => {
    expect(labSearch("share=abc&as=alice", "bob", "silent-empty")).toBe(
      "share=abc&as=bob&chip=silent-empty",
    );
  });

  it("drops the chip when the SQL no longer matches one", () => {
    expect(labSearch("as=alice&chip=owner-policy", "alice", null)).toBe("as=alice");
  });
});
