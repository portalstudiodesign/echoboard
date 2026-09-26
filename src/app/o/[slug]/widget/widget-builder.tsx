"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { defaultWidgetOptions, widgetSnippet, type WidgetOptions } from "@/features/widget/snippet";

declare global {
  interface Window {
    Echoboard?: { open(): void; close(): void; toggle(): void; destroy(): void };
  }
}

/** Loads the real widget.js into this page with the current options, replacing any previous copy. */
function useLivePreview(options: WidgetOptions) {
  useEffect(() => {
    window.Echoboard?.destroy();
    const script = document.createElement("script");
    script.src = "/widget.js";
    script.async = true;
    script.dataset.org = options.orgSlug;
    script.dataset.position = options.position;
    script.dataset.label = options.label.trim() || defaultWidgetOptions.label;
    script.dataset.color = options.color;
    if (!options.showButton) script.dataset.button = "none";
    document.body.appendChild(script);
    return () => {
      window.Echoboard?.destroy();
      script.remove();
    };
  }, [options]);
}

export function WidgetBuilder({ orgSlug, appUrl }: { orgSlug: string; appUrl: string }) {
  const [options, setOptions] = useState<WidgetOptions>({ orgSlug, ...defaultWidgetOptions });
  const [copied, setCopied] = useState(false);
  const snippet = widgetSnippet(appUrl, options);
  useLivePreview(options);

  function update(changes: Partial<WidgetOptions>) {
    setOptions((current) => ({ ...current, ...changes }));
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        {/* autoComplete=off: stop the browser restoring stale values on back/forward, which would desync them from the snippet. */}
        <Field label="Button text" htmlFor="widget-label">
          <Input id="widget-label" autoComplete="off" value={options.label} maxLength={24} onChange={(event) => update({ label: event.target.value })} />
        </Field>
        <Field label="Position" htmlFor="widget-position">
          <Select id="widget-position" autoComplete="off" value={options.position} onChange={(event) => update({ position: event.target.value as WidgetOptions["position"] })}>
            <option value="right">Bottom right</option>
            <option value="left">Bottom left</option>
          </Select>
        </Field>
        <Field label="Button colour" htmlFor="widget-color">
          <div className="flex items-center gap-2">
            <input
              id="widget-color"
              autoComplete="off"
              type="color"
              value={options.color}
              onChange={(event) => update({ color: event.target.value })}
              className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-surface p-1"
            />
            <span className="font-mono text-sm text-muted">{options.color}</span>
          </div>
        </Field>
        <Field label="Launcher" htmlFor="widget-button" hint={options.showButton ? undefined : "Call Echoboard.open() from your own button."}>
          <Select id="widget-button" autoComplete="off" value={options.showButton ? "button" : "none"} onChange={(event) => update({ showButton: event.target.value === "button" })}>
            <option value="button">Floating button</option>
            <option value="none">My own button</option>
          </Select>
        </Field>
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Paste this before &lt;/body&gt; on your site</h2>
          <Button variant="secondary" className="h-8 px-3 text-xs" onClick={copy} aria-live="polite">
            {copied ? "Copied ✓" : "Copy snippet"}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          {snippet}
        </pre>
        {!options.showButton && (
          <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-4 font-mono text-xs">
            {`<button onclick="Echoboard.open()">Give feedback</button>`}
          </pre>
        )}
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <p className="text-muted">
          {options.showButton ? "The live widget is running on this page — look at the bottom corner." : "The widget is loaded on this page without a button."}
        </p>
        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => window.Echoboard?.toggle()}>
          Open widget
        </Button>
      </Card>
    </div>
  );
}
