export type WidgetOptions = {
  orgSlug: string;
  position: "right" | "left";
  label: string;
  color: string;
  showButton: boolean;
};

export const defaultWidgetOptions: Omit<WidgetOptions, "orgSlug"> = {
  position: "right",
  label: "Feedback",
  color: "#4f46e5",
  showButton: true,
};

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The exact <script> tag a customer pastes into their site. Only non-default options are written out. */
export function widgetSnippet(appUrl: string, options: WidgetOptions): string {
  const attributes: [string, string][] = [["data-org", options.orgSlug]];
  if (options.position !== defaultWidgetOptions.position) attributes.push(["data-position", options.position]);
  const label = options.label.trim();
  if (label && label !== defaultWidgetOptions.label) attributes.push(["data-label", label]);
  if (options.color.toLowerCase() !== defaultWidgetOptions.color) attributes.push(["data-color", options.color]);
  if (!options.showButton) attributes.push(["data-button", "none"]);

  const rendered = attributes.map(([name, value]) => `${name}="${escapeAttribute(value)}"`).join(" ");
  return `<script src="${appUrl.replace(/\/$/, "")}/widget.js" ${rendered} async></script>`;
}
