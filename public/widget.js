/*!
 * Echoboard feedback widget loader.
 *
 *   <script src="https://YOUR-ECHOBOARD/widget.js" data-org="your-slug" async></script>
 *
 * Options (data-* attributes on the script tag):
 *   data-org       required  workspace slug
 *   data-position  "right" (default) | "left"
 *   data-label     button text, default "Feedback"
 *   data-color     button colour (any CSS colour), default indigo
 *   data-button    "none" hides the floating button — open it from your own UI with Echoboard.open()
 *
 * The board itself renders in an iframe served by Echoboard, so nothing here can clash with
 * the host page's CSS or scripts; the button lives in a shadow root for the same reason.
 */
(function () {
  "use strict";
  if (window.Echoboard) return; // loaded twice — keep the first instance

  var script = document.currentScript;
  if (!script) return;
  var org = script.getAttribute("data-org");
  if (!org || !/^[a-z0-9-]+$/.test(org)) {
    console.error("[Echoboard] Add data-org=\"your-workspace-slug\" to the widget <script> tag.");
    return;
  }
  var origin = new URL(script.src).origin;
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var label = script.getAttribute("data-label") || "Feedback";
  var color = script.getAttribute("data-color") || "#4f46e5";
  var showButton = script.getAttribute("data-button") !== "none";

  var host = document.createElement("div");
  host.setAttribute("data-echoboard", "");
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent =
    ":host{all:initial}" +
    ".btn{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483646;display:flex;align-items:center;gap:8px;" +
    "padding:0 16px;height:44px;border:0;border-radius:22px;background:var(--eb-color);color:#fff;" +
    "font:600 14px/1 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.18);transition:transform .15s ease,box-shadow .15s ease}" +
    ".btn:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(0,0,0,.22)}" +
    ".btn:focus-visible{outline:3px solid var(--eb-color);outline-offset:3px}" +
    ".panel{position:fixed;bottom:76px;" + side + ":20px;z-index:2147483647;width:380px;height:600px;" +
    "max-height:calc(100vh - 96px);border-radius:16px;overflow:hidden;background:#fff;" +
    "box-shadow:0 18px 60px rgba(0,0,0,.28);opacity:0;transform:translateY(8px) scale(.98);" +
    "transform-origin:bottom " + side + ";transition:opacity .16s ease,transform .16s ease;pointer-events:none}" +
    ".panel.open{opacity:1;transform:none;pointer-events:auto}" +
    ".panel.no-button{bottom:20px;max-height:calc(100vh - 40px)}" +
    "iframe{width:100%;height:100%;border:0;display:block}" +
    "@media (max-width:480px){.panel,.panel.no-button{inset:0;width:auto;height:auto;max-height:none;border-radius:0}}" +
    "@media (prefers-reduced-motion:reduce){.btn,.panel{transition:none}}";
  root.appendChild(style);
  host.style.setProperty("--eb-color", color);

  var button;
  if (showButton) {
    button = document.createElement("button");
    button.className = "btn";
    button.type = "button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M4 5h16v11H9l-5 4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    button.appendChild(document.createTextNode(label));
    button.addEventListener("click", function () {
      toggle();
    });
    root.appendChild(button);
  }

  var panel = document.createElement("div");
  panel.className = "panel" + (showButton ? "" : " no-button");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", label);
  panel.hidden = true;
  root.appendChild(panel);

  var frame; // created on first open so the host page pays nothing until then
  var isOpen = false;

  function open() {
    if (isOpen) return;
    if (!frame) {
      frame = document.createElement("iframe");
      frame.title = label;
      frame.src = origin + "/embed/" + encodeURIComponent(org);
      panel.appendChild(frame);
    }
    panel.hidden = false;
    // next frame, so the opening transition runs
    requestAnimationFrame(function () {
      panel.classList.add("open");
    });
    isOpen = true;
    if (button) button.setAttribute("aria-expanded", "true");
    frame.focus();
  }

  function close() {
    if (!isOpen) return;
    panel.classList.remove("open");
    setTimeout(function () {
      if (!isOpen) panel.hidden = true;
    }, 180);
    isOpen = false;
    if (button) {
      button.setAttribute("aria-expanded", "false");
      button.focus();
    }
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
  }

  // The embed page asks to be closed via postMessage; only trust messages from our own frame.
  function onMessage(event) {
    if (event.origin !== origin || !frame || event.source !== frame.contentWindow) return;
    if (event.data && event.data.type === "echoboard:close") close();
  }

  function mount() {
    document.body.appendChild(host);
  }

  /** Removes every trace of the widget, e.g. before loading it again with other options. */
  function destroy() {
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("message", onMessage);
    document.removeEventListener("DOMContentLoaded", mount);
    host.remove();
    delete window.Echoboard;
  }

  document.addEventListener("keydown", onKeydown);
  window.addEventListener("message", onMessage);
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.Echoboard = { open: open, close: close, toggle: toggle, destroy: destroy };
})();
