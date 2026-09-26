"use client";

import { useEffect, useSyncExternalStore } from "react";

const noSubscription = () => () => {};
const requestClose = () => window.parent.postMessage({ type: "echoboard:close" }, "*");

/** Asks the widget loader on the host page to close the panel. Only shown when framed. */
export function CloseButton() {
  // Server render and first client render agree (false); the real value applies right after hydration.
  const framed = useSyncExternalStore(noSubscription, () => window.parent !== window, () => false);

  // Keystrokes inside the iframe never reach the host page, so Escape is forwarded from here.
  useEffect(() => {
    if (!framed) return;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [framed]);

  if (!framed) return null;
  return (
    <button
      type="button"
      onClick={requestClose}
      aria-label="Close feedback panel"
      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
