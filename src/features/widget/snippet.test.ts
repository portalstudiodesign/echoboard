import { describe, expect, it } from "vitest";
import { defaultWidgetOptions, widgetSnippet } from "./snippet";

const base = { orgSlug: "acme", ...defaultWidgetOptions };

describe("widgetSnippet", () => {
  it("keeps the default snippet minimal", () => {
    expect(widgetSnippet("https://echo.example/", base)).toBe(
      '<script src="https://echo.example/widget.js" data-org="acme" async></script>',
    );
  });

  it("writes out only the options that differ from the defaults", () => {
    const snippet = widgetSnippet("https://echo.example", { ...base, position: "left", label: "Ideas", color: "#E11D48", showButton: false });
    expect(snippet).toContain('data-position="left"');
    expect(snippet).toContain('data-label="Ideas"');
    expect(snippet).toContain('data-color="#E11D48"');
    expect(snippet).toContain('data-button="none"');
  });

  it("escapes attribute values so a label can't break out of the tag", () => {
    const snippet = widgetSnippet("https://echo.example", { ...base, label: '"><img src=x onerror=alert(1)>' });
    expect(snippet).not.toContain("<img");
    expect(snippet).toContain('data-label="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
  });
});
