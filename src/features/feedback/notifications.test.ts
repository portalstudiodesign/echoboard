import { afterEach, describe, expect, it, vi } from "vitest";
import * as email from "@/lib/email";
import { deliverAll, mergedEmails, statusChangedEmails } from "./notifications";

describe("notification emails", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one personal status email per voter", () => {
    const emails = statusChangedEmails(
      [
        { email: "ana@example.test", name: "Ana Pop" },
        { email: "bob@example.test", name: "Bob" },
      ],
      { orgName: "Acme", postTitle: "Dark mode", status: "in_progress", url: "https://x.test/p/1" },
    );
    expect(emails.map((e) => e.to)).toEqual(["ana@example.test", "bob@example.test"]);
    expect(emails[0]).toMatchObject({ subject: '[Acme] "Dark mode" is now in progress' });
    expect(emails[0].text).toContain("Hi Ana,");
    expect(emails[0].text).toContain("https://x.test/p/1");
  });

  it("celebrates shipped ideas", () => {
    const [shipped] = statusChangedEmails([{ email: "a@x.test", name: "A" }], {
      orgName: "Acme",
      postTitle: "Dark mode",
      status: "complete",
      url: "u",
    });
    expect(shipped.subject).toContain("Shipped");
  });

  it("tells voters where their vote went after a merge", () => {
    const [moved] = mergedEmails([{ email: "a@x.test", name: "A" }], {
      orgName: "Acme",
      duplicateTitle: "Night theme",
      targetTitle: "Dark mode",
      url: "u",
    });
    expect(moved.subject).toBe('[Acme] Your vote moved to "Dark mode"');
  });

  it("keeps delivering when one email fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(email, "sendEmail").mockImplementation(async (e) => {
      if (e.to === "bad@x.test") throw new Error("rejected");
    });
    const result = await deliverAll(
      ["a@x.test", "bad@x.test", "c@x.test"].map((to) => ({ to, subject: "s", text: "t" })),
      2,
    );
    expect(result).toEqual({ sent: 2, failed: 1 });
  });
});
