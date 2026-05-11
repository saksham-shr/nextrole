/**
 * NextRole Apply Card
 *
 * Large tabbed overlay for filling out job applications.
 * Triggered by:
 *   1. nr:open-apply-card CustomEvent (dispatched by content.js after save)
 *   2. Auto-detect: ATS page + fresh nr_cross_site_job session context
 *
 * Tabs: Fill Form | Evaluation | Resume | Cover Letter
 *
 * Field fill protocol with auto-fill.js:
 *   nr:scan-req  → auto-fill.js scans fields, responds with nr:scan-res
 *   nr:write     → auto-fill.js writes values into form, responds with nr:write-done
 */

(function () {
"use strict";

// ─── Styles ───────────────────────────────────────────────────────────────────

const AC_STYLE = `
  #nr-apply-card {
    position: fixed;
    top: 16px;
    right: 16px;
    bottom: 16px;
    z-index: 2147483647;
    width: 380px;
    background: #fffdf8;
    border: 1.5px solid #2a2620;
    border-radius: 16px;
    box-shadow: 0 8px 48px rgba(26,24,20,0.28);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    color: #1a1814;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  #nr-apply-card.nr-ac-min {
    bottom: auto;
    height: 48px;
  }

  .nr-ac-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 14px;
    background: #c84a1f;
    color: #fffdf8;
    flex-shrink: 0;
    border-radius: 14px 14px 0 0;
  }
  .nr-ac-brand {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .nr-ac-controls { display: flex; align-items: center; gap: 2px; }
  .nr-ac-icon-btn {
    background: none; border: none;
    color: rgba(255,253,248,0.65); cursor: pointer;
    font-size: 16px; line-height: 1; padding: 2px 5px; border-radius: 4px;
  }
  .nr-ac-icon-btn:hover { color: #fffdf8; background: rgba(255,253,248,0.15); }

  .nr-ac-inner { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 0; }
  #nr-apply-card.nr-ac-min .nr-ac-inner { display: none; }
  #nr-apply-card.nr-ac-min .nr-ac-header { border-radius: 14px; }

  .nr-ac-job-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    border-bottom: 1px solid #ede8e0;
    background: #faf8f4;
    flex-shrink: 0;
  }
  .nr-ac-job-bar-info { flex: 1; min-width: 0; }
  .nr-ac-jb-title   { font-size: 12.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nr-ac-jb-company { font-size: 11.5px; color: #6b6358; }
  .nr-ac-jb-score {
    font-size: 11.5px; font-weight: 600; padding: 2px 8px;
    border-radius: 12px; flex-shrink: 0;
  }
  .nr-ac-jb-score.apply { background: #edf7ee; color: #2f7a3a; }
  .nr-ac-jb-score.watch { background: #fef9ec; color: #8a6d1a; }
  .nr-ac-jb-score.skip  { background: #faebeb; color: #b53a3a; }

  .nr-ac-tabs {
    display: flex;
    padding: 0 12px;
    border-bottom: 1.5px solid #ede8e0;
    background: #f5f0e8;
    flex-shrink: 0;
    gap: 2px;
  }
  .nr-ac-tab {
    padding: 9px 11px;
    font-size: 11.5px;
    font-weight: 500;
    color: #6b6358;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1.5px;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
  }
  .nr-ac-tab:hover { color: #1a1814; }
  .nr-ac-tab.active { color: #c84a1f; border-bottom-color: #c84a1f; font-weight: 600; }

  .nr-ac-body {
    overflow-y: auto;
    flex: 1;
    padding: 14px 16px;
    min-height: 0;
  }

  /* ── Buttons ── */
  .nr-ac-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 5px;
    padding: 9px 14px; border-radius: 9px; border: none;
    font-size: 12px; font-weight: 500; cursor: pointer;
    font-family: inherit; transition: opacity 0.15s; white-space: nowrap;
  }
  .nr-ac-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .nr-ac-btn:hover:not(:disabled) { opacity: 0.85; }
  .nr-ac-primary   { background: #c84a1f; color: #fffdf8; }
  .nr-ac-secondary { background: #f0ebe3; color: #2a2620; }
  .nr-ac-ghost     { background: none; color: #c84a1f; font-size: 12px; padding: 0; }
  .nr-ac-full      { width: 100%; }

  .nr-ac-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .nr-ac-row .nr-ac-btn { flex: 1; }

  /* ── Confirm screen ── */
  .nr-ac-confirm-title { font-size: 13.5px; font-weight: 600; margin-bottom: 4px; }
  .nr-ac-confirm-sub   { font-size: 12px; color: #6b6358; margin-bottom: 14px; line-height: 1.5; }
  .nr-ac-label {
    font-size: 10.5px; font-weight: 600; color: #9a9286;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;
  }
  .nr-ac-job-box { padding: 10px 12px; background: #f5f0e8; border-radius: 10px; margin-bottom: 12px; }
  .nr-ac-jb-box-title   { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .nr-ac-jb-box-company { font-size: 12px; color: #6b6358; }

  select.nr-ac-select {
    width: 100%; padding: 8px 10px; border-radius: 8px;
    border: 1.5px solid #e0d8d0; background: #fffdf8;
    font-size: 12.5px; color: #1a1814; margin-bottom: 14px;
    font-family: inherit; cursor: pointer; appearance: auto;
  }
  select.nr-ac-select:focus { outline: none; border-color: #c84a1f; }

  /* ── Fill Form tab ── */
  .nr-ac-field-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .nr-ac-field-row {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; background: #f5f0e8; border-radius: 9px;
  }
  .nr-ac-field-row.nr-ac-ai { background: rgba(200,74,31,0.06); }
  .nr-ac-field-row.nr-ac-select-row { background: #edf7ee; }
  .nr-ac-field-lbl {
    font-size: 10.5px; font-weight: 600; color: #6b6358;
    text-transform: uppercase; letter-spacing: 0.06em;
    width: 86px; flex-shrink: 0; padding-top: 2px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .nr-ac-field-val { flex: 1; min-width: 0; }
  .nr-ac-finput {
    width: 100%; box-sizing: border-box;
    padding: 5px 8px; border: 1.5px solid #e0d8d0; border-radius: 6px;
    font-size: 12px; font-family: inherit; background: #fffdf8; color: #1a1814;
    resize: vertical; min-height: 28px;
  }
  .nr-ac-finput:focus { outline: none; border-color: #c84a1f; }
  .nr-ac-gen-btn {
    display: inline-flex; align-items: center; gap: 4px; margin-top: 5px;
    padding: 3px 8px; border-radius: 6px;
    border: 1px solid rgba(200,74,31,0.35); background: rgba(200,74,31,0.07);
    color: #c84a1f; font-size: 10.5px; font-weight: 600;
    cursor: pointer; white-space: nowrap; transition: background 0.15s;
  }
  .nr-ac-gen-btn:hover:not(:disabled) { background: rgba(200,74,31,0.15); }
  .nr-ac-gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .nr-ac-select-note { font-size: 11.5px; color: #2f7a3a; padding-top: 2px; }

  /* ── Eval tab ── */
  .nr-ac-score-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .nr-ac-score { font-size: 30px; font-weight: 700; font-family: monospace; }
  .nr-ac-dec-badge {
    display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  }
  .nr-ac-dec-badge.apply { background: #edf7ee; color: #2f7a3a; }
  .nr-ac-dec-badge.watch { background: #fef9ec; color: #8a6d1a; }
  .nr-ac-dec-badge.skip  { background: #faebeb; color: #b53a3a; }
  .nr-ac-block { padding: 10px 12px; background: #f5f0e8; border-radius: 9px; margin-bottom: 8px; }
  .nr-ac-block-title { font-size: 10.5px; font-weight: 600; color: #6b6358; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .nr-ac-block-body  { font-size: 12.5px; line-height: 1.55; }

  /* ── Resume tab ── */
  .nr-ac-resume-meta { font-size: 12px; color: #6b6358; margin-bottom: 8px; }
  .nr-ac-resume-frame-wrap {
    border: 1.5px solid #e0d8d0; border-radius: 9px;
    overflow: hidden; margin-bottom: 10px; background: #fff;
  }
  .nr-ac-resume-frame {
    width: 100%; height: 460px; border: none; display: block;
  }

  /* ── Cover Letter tab ── */
  .nr-ac-cl-ta {
    width: 100%; box-sizing: border-box; min-height: 240px;
    padding: 10px 12px; border: 1.5px solid #e0d8d0; border-radius: 9px;
    font-size: 12.5px; font-family: inherit; background: #fffdf8; color: #1a1814;
    resize: vertical; line-height: 1.6; margin-bottom: 10px;
  }
  .nr-ac-cl-ta:focus { outline: none; border-color: #c84a1f; }

  /* ── Utility ── */
  .nr-ac-loading { text-align: center; padding: 24px 16px; color: #9a9286; font-size: 12.5px; }
  .nr-ac-empty   { text-align: center; padding: 20px 16px; color: #9a9286; font-size: 12.5px; line-height: 1.6; }

  /* Eval empty state CTA */
  .nr-ac-eval-empty {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 28px 8px 16px;
  }
  .nr-ac-eval-empty-icon {
    font-size: 32px; color: #c84a1f; margin-bottom: 12px; line-height: 1;
  }
  .nr-ac-eval-empty-title {
    font-size: 14px; font-weight: 600; color: #1a1814; margin-bottom: 8px;
  }
  .nr-ac-eval-empty-desc {
    font-size: 12px; color: #6b6358; line-height: 1.55; margin-bottom: 18px;
  }
  .nr-ac-eval-divider {
    display: flex; align-items: center; gap: 8px;
    width: 100%; margin: 16px 0 10px; color: #9a9286; font-size: 11px;
  }
  .nr-ac-eval-divider::before,
  .nr-ac-eval-divider::after {
    content: ""; flex: 1; height: 1px; background: #e0d8d0;
  }
  .nr-ac-err     { padding: 10px 12px; background: #faebeb; border-radius: 9px; font-size: 12px; color: #b53a3a; margin-bottom: 10px; }
  .nr-ac-hint    { font-size: 11.5px; color: #6b6358; margin-bottom: 10px; line-height: 1.45; }
  .nr-ac-divider { height: 1px; background: #ede8e0; margin: 12px 0; }
  .nr-ac-status  { font-size: 12px; color: #6b6358; margin-top: 8px; min-height: 16px; }

  /* ── Naukri Q&A helper ── */
  .nr-ac-naukri-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 12px; border-radius: 10px;
    background: #fff8f0; border: 1.5px solid #f0c070;
    margin-bottom: 12px;
  }
  .nr-ac-naukri-banner-icon { font-size: 20px; line-height: 1.2; flex-shrink: 0; }
  .nr-ac-naukri-banner-title { font-size: 12.5px; font-weight: 600; color: #7a4a00; margin-bottom: 2px; }
  .nr-ac-naukri-banner-sub   { font-size: 11.5px; color: #9a6020; line-height: 1.45; }

  .nr-ac-copy-btn {
    flex-shrink: 0;
    padding: 2px 7px; border-radius: 5px;
    border: 1px solid #c0bab2; background: #f5f0e8;
    color: #6b6358; font-size: 11px; cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .nr-ac-copy-btn:hover { background: #c84a1f; border-color: #c84a1f; color: #fff; }

  /* ── Workday section helper ── */
  .nr-ac-workday-banner {
    display: flex; align-items: flex-start; gap: 10px;
    background: #e8f4fd; border: 1px solid #0875e1;
    border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;
  }
  .nr-ac-workday-banner-icon { font-size: 20px; line-height: 1.2; flex-shrink: 0; }
  .nr-ac-workday-banner-title { font-size: 12.5px; font-weight: 600; color: #0057b8; margin-bottom: 2px; }
  .nr-ac-workday-banner-sub   { font-size: 11.5px; color: #1a6bbf; line-height: 1.45; }

  /* ── Accenture step helper ── */
  .nr-ac-accenture-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 12px; border-radius: 10px;
    background: #f0f4ff; border: 1.5px solid #7c9ef0;
    margin-bottom: 12px;
  }
  .nr-ac-accenture-banner-icon { font-size: 20px; line-height: 1.2; flex-shrink: 0; }
  .nr-ac-accenture-banner-title { font-size: 12.5px; font-weight: 600; color: #1a2980; margin-bottom: 2px; }
  .nr-ac-accenture-banner-sub   { font-size: 11.5px; color: #3a55a0; line-height: 1.45; }

  .nr-ac-step-section { margin-bottom: 10px; }
  .nr-ac-step-section-title {
    font-size: 10px; font-weight: 700; color: #9a9286;
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;
  }
  .nr-ac-readonly-note {
    font-size: 11px; color: #2f7a3a; background: #edf7ee;
    border-radius: 6px; padding: 5px 9px; margin-bottom: 8px;
  }
  .nr-ac-manual-note {
    font-size: 11px; color: #8a6d1a; background: #fef9ec;
    border-radius: 6px; padding: 5px 9px; margin-bottom: 8px;
  }

  @keyframes nr-ac-spin { to { transform: rotate(360deg); } }
  .nr-ac-spin {
    display: inline-block; width: 12px; height: 12px; vertical-align: middle;
    border: 2px solid rgba(200,74,31,0.2); border-top-color: #c84a1f;
    border-radius: 50%; animation: nr-ac-spin 0.8s linear infinite;
  }

  /* ── Drag & resize ── */
  .nr-ac-header { cursor: grab; }
  .nr-ac-header:active { cursor: grabbing; }
  .nr-ac-header button { cursor: pointer; }

  .nr-ac-resize-se,
  .nr-ac-resize-sw {
    position: absolute;
    bottom: 0;
    width: 20px; height: 20px;
    z-index: 1;
  }
  .nr-ac-resize-se { right: 0; cursor: se-resize; }
  .nr-ac-resize-sw { left: 0;  cursor: sw-resize; }
  .nr-ac-resize-se::after,
  .nr-ac-resize-sw::after {
    content: '';
    position: absolute;
    bottom: 5px;
    width: 9px; height: 9px;
    border-bottom: 2.5px solid rgba(200,74,31,0.45);
    border-radius: 0 0 3px 0;
  }
  .nr-ac-resize-se::after { right: 5px; border-right: 2.5px solid rgba(200,74,31,0.45); }
  .nr-ac-resize-sw::after { left: 5px;  border-left:  2.5px solid rgba(200,74,31,0.45); border-radius: 0 0 0 3px; }

  .nr-ac-resize-se:hover::after,
  .nr-ac-resize-sw:hover::after {
    border-color: #c84a1f;
  }
`;

function injectStyles() {
  if (document.getElementById("nr-ac-styles")) return;
  const el = document.createElement("style");
  el.id = "nr-ac-styles";
  el.textContent = AC_STYLE;
  (document.head || document.documentElement).appendChild(el);
}

function esc(s) {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── ATS detection (mirrors auto-fill.js patterns) ────────────────────────────

const AC_ATS_PATTERNS = [
  /boards\.greenhouse\.io/, /grnh\.se/, /jobs\.lever\.co/, /lever\.co\/apply/,
  /jobs\.ashbyhq\.com/, /myworkdayjobs\.com/, /smartrecruiters\.com/,
  /apply\.workable\.com/, /linkedin\.com\/jobs\/easy-apply/, /icims\.com/,
  /bamboohr\.com\/careers/, /jobs\.jobvite\.com/, /recruiting\.ultipro\.com/,
  /applytojob\.com/, /jazz\.co/, /\.recruitee\.com/, /\.breezy\.hr/,
  /jobs\.rippling\.com/, /\.freshteam\.com\/jobs/, /\.teamtailor\.com/,
  /jobs\.personio\./, /taleo\.net/, /oraclecloud\.com\/hcmUI/,
  /oracle\.com\/.*apply/, /fa\.[a-z0-9]+\.oraclecloud\.com/,
  /successfactors\.com/, /sapsf\.com/,
  /prejoiner.*\.azurewebsites\.net/,
  /candidate\.accenture\.com/,
  // FAANG career pages
  /\bamazon\.jobs\b/, /hiring\.amazon\.com/, /amazon\.dejobs\.org/,
  /metacareers\.com/, /careers\.meta\.com/, /facebook\.com\/careers/,
  /careers\.google\.com/, /google\.com\/about\/careers/,
  /jobs\.apple\.com/,
  /careers\.microsoft\.com/, /jobs\.careers\.microsoft\.com/,
  // Survey-form applications + Easy Apply overlays
  /docs\.google\.com\/forms/, /forms\.gle/,
  /forms\.office\.com/, /forms\.microsoft\.com/,
  /linkedin\.com\/jobs/, /apply\.indeed\.com/, /indeed\.com\/.*apply/,
];

function looksLikeFormPage() {
  if (AC_ATS_PATTERNS.some((p) => p.test(location.href))) return true;
  return /apply|application/i.test(location.href) && !!document.querySelector("form input, form textarea");
}

// ─── State ────────────────────────────────────────────────────────────────────

let _card      = null;   // current card DOM node
let _dismissed = false;  // user closed card on this page load
let _fieldVals = {};     // fieldId → value shown/edited in card UI

// ─── Card lifecycle ───────────────────────────────────────────────────────────

function removeCard() {
  if (_card?._nrCleanup) _card._nrCleanup();
  _card?.remove();
  _card = null;
}

// ─── Drag & resize ────────────────────────────────────────────────────────────

function enableDragAndResize(card) {
  const header = card.querySelector(".nr-ac-header");

  // Add resize grips (bottom-right and bottom-left)
  const gripSE = document.createElement("div");
  gripSE.className = "nr-ac-resize-se";
  card.appendChild(gripSE);

  const gripSW = document.createElement("div");
  gripSW.className = "nr-ac-resize-sw";
  card.appendChild(gripSW);

  // Convert from CSS top/right/bottom to explicit left/top/width/height
  // so we can manipulate position freely
  requestAnimationFrame(() => {
    const r = card.getBoundingClientRect();
    card.style.left   = r.left + "px";
    card.style.top    = r.top  + "px";
    card.style.width  = r.width  + "px";
    card.style.height = r.height + "px";
    card.style.right  = "auto";
    card.style.bottom = "auto";
  });

  let op = null; // { type, startX, startY, startLeft, startTop, startW, startH }

  function startOp(e, type) {
    if (type === "drag" && e.target.closest("button")) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    op = { type, startX: e.clientX, startY: e.clientY,
           startLeft: r.left, startTop: r.top, startW: r.width, startH: r.height };
    document.body.style.userSelect = "none";
  }

  function onMove(e) {
    if (!op) return;
    const dx = e.clientX - op.startX;
    const dy = e.clientY - op.startY;

    if (op.type === "drag") {
      const newLeft = Math.max(0, Math.min(window.innerWidth  - op.startW, op.startLeft + dx));
      const newTop  = Math.max(0, Math.min(window.innerHeight - 48,        op.startTop  + dy));
      card.style.left = newLeft + "px";
      card.style.top  = newTop  + "px";

    } else if (op.type === "resize-se") {
      // Bottom-right: expand right + down
      const maxH = window.innerHeight - op.startTop - 8;
      card.style.width  = Math.max(280, Math.min(900, op.startW + dx)) + "px";
      card.style.height = Math.max(200, Math.min(maxH, op.startH + dy)) + "px";

    } else if (op.type === "resize-sw") {
      // Bottom-left: expand left (move card + widen) + down
      const newW    = Math.max(280, Math.min(900, op.startW - dx));
      const newLeft = op.startLeft + op.startW - newW; // keep right edge fixed
      const maxH    = window.innerHeight - op.startTop - 8;
      card.style.left   = Math.max(0, newLeft) + "px";
      card.style.width  = newW + "px";
      card.style.height = Math.max(200, Math.min(maxH, op.startH + dy)) + "px";
    }
  }

  function onUp() {
    if (!op) return;
    op = null;
    document.body.style.userSelect = "";
  }

  header.addEventListener("mousedown",  (e) => startOp(e, "drag"));
  gripSE.addEventListener("mousedown",  (e) => startOp(e, "resize-se"));
  gripSW.addEventListener("mousedown",  (e) => startOp(e, "resize-sw"));
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup",   onUp);

  // Expose cleanup so removeCard can detach document listeners
  card._nrCleanup = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup",   onUp);
  };
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function getCrossSiteCtx() {
  return new Promise((resolve) => {
    chrome.storage.session.get("nr_cross_site_job", (d) => resolve(d.nr_cross_site_job ?? null));
  });
}

// ─── Service worker calls ─────────────────────────────────────────────────────

function swMsg(msg, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      console.warn("[NextRole] swMsg timeout:", msg.type);
      resolve({ ok: false, error: `Request timed out (${msg.type})` });
    }, timeoutMs);
    chrome.runtime.sendMessage(msg, (res) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      if (chrome.runtime.lastError) {
        console.warn("[NextRole] swMsg lastError:", msg.type, chrome.runtime.lastError.message);
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(res);
    });
  });
}

// ─── Tailor + evaluation picker (shared across ATS-specific renderers) ───────
//
// State lives in chrome.storage.session keyed by job URL so the user's
// selection survives the panel collapsing/reopening on the same page.

function _tailorStateKey() {
  return `nr_tailor_state_${location.href.split("?")[0].replace(/\/$/, "")}`;
}

async function loadTailorState() {
  return new Promise((resolve) => {
    chrome.storage.session.get(_tailorStateKey(), (d) => {
      const entry = d[_tailorStateKey()];
      resolve(entry ?? { evaluation_id: null, tailor_enabled: false, last_answers: null });
    });
  });
}

async function saveTailorState(patch) {
  const cur = await loadTailorState();
  const next = { ...cur, ...patch };
  return new Promise((resolve) => {
    chrome.storage.session.set({ [_tailorStateKey()]: next }, () => resolve(next));
  });
}

// Build the HTML for the picker + toggle section, to be inserted into the
// existing ATS-specific card UI. `tier` controls whether the toggle is enabled.
function buildEvalPickerHtml({ tier, autoMatch, recent, state, tailorUsesToday }) {
  const canTailor = tier === "starter" || tier === "pro";

  // Tier-specific toggle label
  let toggleLabel, toggleDisabled = false, toggleHint;
  if (tier === "pro") {
    toggleLabel = "Tailor freeform answers with AI ✨";
    toggleHint  = "Uses 8 credits per session";
  } else if (tier === "starter") {
    const remaining = Math.max(0, 1 - (tailorUsesToday ?? 0));
    toggleLabel = "Tailor freeform answers with AI ✨";
    toggleHint  = remaining > 0
      ? `${remaining} tailor session left today (Starter)`
      : "Daily tailor used — resets at midnight (or upgrade to Pro)";
    toggleDisabled = remaining === 0;
  } else {
    toggleLabel = "Tailor with AI ✨ — Starter+";
    toggleHint  = "Upgrade to Starter or Pro to unlock AI tailoring";
    toggleDisabled = true;
  }

  const evalOptions = recent.map((r) => {
    const label = `${r.job_title} · ${r.company}${r.score ? ` · ⭐ ${r.score.toFixed(1)}` : ""}`;
    const selected = state.evaluation_id === r.evaluation_id ? "selected" : "";
    return `<option value="${r.evaluation_id}" ${selected}>${escapeAttr(label)}</option>`;
  }).join("");

  const autoMatchBanner = autoMatch
    ? `<div style="font-size:11px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:4px 8px;margin-bottom:6px;">
         ✓ Auto-matched: ⭐ ${autoMatch.score?.toFixed(1) ?? "?"} for <strong>${escapeAttr(autoMatch.job_title)}</strong>
       </div>`
    : "";

  return `
    <div class="nr-tailor-section" style="background:#fafafa;border:1px solid #e8e4de;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:600;color:#6b6560;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">
        Tailor for this job
      </div>
      ${autoMatchBanner}

      <label style="display:block;font-size:11.5px;color:#6b6560;margin-bottom:3px;">Linked evaluation</label>
      <select id="nr-eval-picker" style="width:100%;padding:6px 8px;border:1px solid #d6d2cc;border-radius:6px;font-size:12px;background:#fff;margin-bottom:8px;">
        <option value="">— None (use profile only) —</option>
        ${evalOptions}
      </select>

      <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;${toggleDisabled ? "opacity:0.55;cursor:not-allowed;" : "cursor:pointer;"}">
        <input type="checkbox" id="nr-tailor-toggle"
               ${state.tailor_enabled && !toggleDisabled ? "checked" : ""}
               ${toggleDisabled ? "disabled" : ""}
               style="margin:0;cursor:${toggleDisabled ? "not-allowed" : "pointer"};">
        <span>${escapeAttr(toggleLabel)}</span>
      </label>
      <div style="font-size:10.5px;color:#8a847e;margin-top:3px;margin-left:22px;">${escapeAttr(toggleHint)}</div>
    </div>`;
}

function escapeAttr(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Wire the picker / toggle event handlers. Returns nothing — state is persisted
// to chrome.storage.session so other calls can read it.
function wireEvalPicker(container, state) {
  const picker = container.querySelector("#nr-eval-picker");
  const toggle = container.querySelector("#nr-tailor-toggle");
  if (picker) {
    picker.addEventListener("change", () => {
      state.evaluation_id = picker.value || null;
      saveTailorState({ evaluation_id: state.evaluation_id });
    });
  }
  if (toggle) {
    toggle.addEventListener("change", () => {
      state.tailor_enabled = toggle.checked;
      saveTailorState({ tailor_enabled: toggle.checked });
    });
  }
}

// Loads recent evaluations + current state. Returns everything the picker UI
// needs to render itself. `jobUrl` defaults to the current page URL.
async function loadEvalContext(jobUrl = location.href) {
  const [evalRes, state, profileRes] = await Promise.all([
    swMsg({ type: "LIST_EVALUATIONS", url: jobUrl }),
    loadTailorState(),
    swMsg({ type: "GET_PROFILE" }),
  ]);
  const recent     = evalRes?.ok ? (evalRes.recent ?? []) : [];
  const autoMatch  = evalRes?.ok ? (evalRes.auto_match ?? null) : null;
  const tier       = profileRes?.profile?.tier ?? "free";
  const tailorUsesToday = profileRes?.profile?.usage?.tailor_sessions_today
                       ?? profileRes?.profile?.usage?.tailor_sessions
                       ?? 0;
  // Apply auto-match as default if no manual selection was made yet
  if (!state.evaluation_id && autoMatch) {
    state.evaluation_id = autoMatch.evaluation_id;
    await saveTailorState({ evaluation_id: autoMatch.evaluation_id });
  }
  return { recent, autoMatch, state, tier, tailorUsesToday };
}

// Called by the ATS-specific filler right before doing the actual fill.
// If the user has toggled tailoring on, it makes the AI call and returns
// the answers map; the filler is responsible for injecting them into the
// matching textareas.
// Returns: { answers, experience_bullets, skills_to_emphasize } | null
async function runTailorIfEnabled({ jobId, job }) {
  const state = await loadTailorState();
  if (!state.tailor_enabled) return null;

  // Cache: if we already ran a tailor for this state, reuse it
  if (state.last_answers && state.last_eval_id === state.evaluation_id) {
    return state.last_answers;
  }

  const fieldsNeeded = ["cover_letter", "why_company", "about_yourself", "experience", "additional_info"];

  const res = await swMsg({
    type:           "TAILOR_FILL",
    jobId:          jobId ?? null,
    evaluationId:   state.evaluation_id ?? null,
    jobTitle:       job?.title ?? "",
    company:        job?.company ?? "",
    jobDescription: job?.description ?? "",
    fieldsNeeded,
  });

  if (!res?.ok) {
    // Return a typed error object so the autopilot can surface a clear banner.
    // We don't block the rest of the fill — profile-only autofill still runs.
    console.warn("[NextRole] Tailor failed:", res?.error);
    return {
      __tailorError:        true,
      message:              res?.error ?? "Tailor request failed",
      cap_reached:          res?.cap_reached === true,
      insufficient_credits: res?.insufficient_credits === true,
      upgrade:              res?.upgrade === true,
    };
  }

  const out = {
    answers:              res.answers ?? {},
    experience_bullets:   res.experience_bullets ?? {},
    skills_to_emphasize:  res.skills_to_emphasize ?? [],
  };

  await saveTailorState({ last_answers: out, last_eval_id: state.evaluation_id });
  return out;
}

async function fetchArtifacts(jobId) {
  const res = await swMsg({ type: "GET_JOB_ARTIFACTS", jobId: jobId ?? undefined });
  if (!res?.ok) return null;
  return res;
}

// ─── Field scan protocol ──────────────────────────────────────────────────────

function requestFieldScan() {
  // Returns the full nr:scan-res detail object { fields, naukriChatbotActive? }
  return new Promise((resolve) => {
    let settled = false;
    const handler = (e) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("nr:scan-res", handler);
      resolve(e.detail ?? { fields: [] });
    };
    document.addEventListener("nr:scan-res", handler);
    document.dispatchEvent(new CustomEvent("nr:scan-req"));
    // Fallback: auto-fill.js might not be loaded (non-ATS page)
    setTimeout(() => {
      if (!settled) {
        settled = true;
        document.removeEventListener("nr:scan-res", handler);
        resolve({ fields: [] });
      }
    }, 1500);
  });
}

// ─── Auto-trigger check ───────────────────────────────────────────────────────

async function checkAutoTrigger() {
  if (_dismissed || _card) return;
  if (!looksLikeFormPage()) return;
  const ctx = await getCrossSiteCtx();
  if (!ctx) return;
  // Only auto-open if context is fresh (< 90 min)
  if ((Date.now() - (ctx.savedAt ?? 0)) > 90 * 60 * 1000) return;
  // Pass the FULL session context (jobTitle / company / jobDescription / fromNaukri)
  // so the confirm screen can show the source job even if it isn't saved in the DB yet.
  openCardFromCtx(ctx);
}

// Auto-trigger entry point — uses session ctx as the hint job when no DB record exists
async function openCardFromCtx(ctx) {
  buildCardShell();
  if (!_card) return;

  const inner = _card.querySelector("#nr-ac-inner");
  if (inner) {
    inner.innerHTML = `<div class="nr-ac-body"><div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading…</div></div>`;
  }

  await loadConfirmScreen(ctx.jobId ?? null, ctx);
}

// ─── Card shell builder (shared by openCard + openCardDirect) ────────────────

function buildCardShell() {
  if (_card) return;
  injectStyles();

  _card = document.createElement("div");
  _card.id = "nr-apply-card";
  _card.innerHTML = `
    <div class="nr-ac-header">
      <div class="nr-ac-brand">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="14" fill="rgba(255,253,248,0.18)"/>
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole · Apply
      </div>
      <div class="nr-ac-controls">
        <button class="nr-ac-icon-btn" id="nr-ac-min" title="Minimise">─</button>
        <button class="nr-ac-icon-btn" id="nr-ac-close" title="Close">×</button>
      </div>
    </div>
    <div class="nr-ac-inner" id="nr-ac-inner"></div>
  `;
  document.body.appendChild(_card);

  _card.querySelector("#nr-ac-close").addEventListener("click", () => {
    _dismissed = true;
    removeCard();
  });
  _card.querySelector("#nr-ac-min").addEventListener("click", () => {
    const min = _card.classList.toggle("nr-ac-min");
    const btn = _card.querySelector("#nr-ac-min");
    btn.title = min ? "Expand" : "Minimise";
    btn.textContent = min ? "□" : "─";
  });

  enableDragAndResize(_card);
}

// Fast path: show card shell immediately, fetch existing artifacts (eval/resume),
// then render the tabbed card with real data — so prior evaluations & resumes are
// visible as soon as the card opens rather than requiring a manual tab switch.
async function openCardDirect(jobId, job) {
  buildCardShell();
  if (!_card) return;

  // Show a spinner in the inner area while we load artifacts
  const inner = _card.querySelector("#nr-ac-inner");
  if (inner) {
    inner.innerHTML = `<div class="nr-ac-body"><div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading…</div></div>`;
  }

  const artifacts  = await fetchArtifacts(jobId);
  const evaluation = artifacts?.evaluation ?? null;
  const resume     = artifacts?.resume     ?? null;

  if (_card) renderTabbedCard(jobId, job, evaluation, resume);
}

// Evaluate-first: open card straight to Evaluation tab and auto-run the evaluation
function openCardEvaluate(jobId, job) {
  buildCardShell();
  renderTabbedCard(jobId, job, null, null, { initialTab: "eval", autoRunEval: true });
}

// ─── Main card entry point ────────────────────────────────────────────────────

async function openCard(jobId) {
  buildCardShell();
  if (!_card) return;

  // Show loading state while we fetch artifacts
  const inner = _card.querySelector("#nr-ac-inner");
  if (inner) {
    inner.innerHTML = `<div class="nr-ac-body"><div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading…</div></div>`;
  }

  // Fetch artifacts (recent jobs + optionally job detail)
  await loadConfirmScreen(jobId);
}

// ─── Load confirm screen (with retry / auth handling) ─────────────────────────

// ctxHint is the raw nr_cross_site_job object (may contain jobTitle/company/jobDescription/fromNaukri)
// passed through from checkAutoTrigger when the card is opened via auto-trigger.
async function loadConfirmScreen(jobId, ctxHint = null) {
  const inner = _card?.querySelector("#nr-ac-inner");
  if (!inner) return;

  inner.innerHTML = `
    <div class="nr-ac-body">
      <div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading your pipeline…</div>
    </div>`;

  const artifacts = await fetchArtifacts(jobId);

  if (artifacts) {
    const { recent_jobs = [], job = null, evaluation = null, resume = null } = artifacts;
    // If the DB returned no job (jobId was null) but the cross-site context has job data
    // (e.g. user came from Naukri without saving first), use that as the "detected" job.
    const resolvedJob = job ?? (ctxHint?.jobTitle
      ? { title: ctxHint.jobTitle, company: ctxHint.company ?? "", description: ctxHint.jobDescription ?? "" }
      : null);
    renderConfirmScreen(jobId, resolvedJob, recent_jobs, evaluation, resume, ctxHint);
    return;
  }

  // fetchArtifacts failed — check if it's an auth problem or just a transient error
  const session = await swMsg({ type: "GET_SESSION" });

  if (!session?.loggedIn) {
    // Genuinely not connected — show sign-in prompt
    renderConnectScreen();
    return;
  }

  // Authenticated but API call failed (network, server error, etc.)
  // Show a retry rather than a misleading "connect" screen
  inner.innerHTML = `
    <div class="nr-ac-body">
      <div class="nr-ac-err" style="margin-bottom:12px;">
        Could not reach NextRole. Check your connection and try again.
      </div>
      <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-retry">↻ Retry</button>
    </div>`;
  inner.querySelector("#nr-ac-retry")?.addEventListener("click", () => loadConfirmScreen(jobId, ctxHint));
}

// ─── Connect screen ───────────────────────────────────────────────────────────

function renderConnectScreen() {
  const inner = _card?.querySelector("#nr-ac-inner");
  if (!inner) return;
  inner.innerHTML = `
    <div class="nr-ac-body" style="text-align:center;">
      <div style="font-size:13.5px;font-weight:600;margin-bottom:8px;">Connect NextRole</div>
      <div style="font-size:12px;color:#6b6358;margin-bottom:14px;line-height:1.5;">
        Sign in to use the application helper.
      </div>
      <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-connect">Connect to NextRole</button>
    </div>
  `;
  inner.querySelector("#nr-ac-connect").addEventListener("click", async () => {
    const btn = inner.querySelector("#nr-ac-connect");
    btn.disabled = true;
    btn.textContent = "Connecting…";
    const res = await swMsg({ type: "CONNECT_EXTENSION" });
    if (res?.ok) {
      removeCard();
      _dismissed = false;
      const ctx = await getCrossSiteCtx();
      openCard(ctx?.jobId ?? null);
    } else {
      btn.disabled = false;
      btn.textContent = "Connect to NextRole";
      const errEl = document.createElement("div");
      errEl.className = "nr-ac-err";
      errEl.style.marginTop = "10px";
      errEl.textContent = res?.error ?? "Connection failed — try again";
      inner.querySelector(".nr-ac-body").appendChild(errEl);
    }
  });
}

// ─── Confirm screen ───────────────────────────────────────────────────────────

function renderConfirmScreen(currentJobId, currentJob, recentJobs, evaluation, resume, ctxHint = null) {
  const inner = _card?.querySelector("#nr-ac-inner");
  if (!inner) return;

  const pickerOpts = recentJobs.map((j) =>
    `<option value="${esc(j.id)}" ${j.id === currentJobId ? "selected" : ""}>
      ${esc(j.title)} — ${esc(j.company)}
    </option>`
  ).join("");

  // Show a banner when the user landed here via a Naukri redirect
  const naukriBanner = ctxHint?.fromNaukri ? `
    <div class="nr-ac-naukri-banner" style="margin-bottom:12px;">
      <div class="nr-ac-naukri-banner-icon">↗</div>
      <div>
        <div class="nr-ac-naukri-banner-title">Redirected from Naukri</div>
        <div class="nr-ac-naukri-banner-sub">
          Job context carried from the Naukri listing — select your pipeline entry to continue.
        </div>
      </div>
    </div>` : "";

  inner.innerHTML = `
    <div class="nr-ac-body">
      ${naukriBanner}
      <div class="nr-ac-confirm-title">Which job are you applying for?</div>
      <div class="nr-ac-confirm-sub">
        Confirm the job so we can load your evaluation and tailor your fill.
      </div>

      ${currentJob ? `
        <div class="nr-ac-label">${ctxHint?.fromNaukri ? "Naukri listing" : "Detected from page"}</div>
        <div class="nr-ac-job-box">
          <div class="nr-ac-jb-box-title">${esc(currentJob.title)}</div>
          <div class="nr-ac-jb-box-company">${esc(currentJob.company)}</div>
        </div>
      ` : ""}

      ${recentJobs.length > 0 ? `
        <div class="nr-ac-label">Choose from your pipeline</div>
        <select class="nr-ac-select" id="nr-ac-picker">${pickerOpts}</select>
        <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-confirm-btn">Continue →</button>
      ` : `
        <div class="nr-ac-empty">
          No jobs in your pipeline yet.<br>
          <span style="font-size:11.5px;">Save a job from a listing page first, then return here.</span>
        </div>
      `}
    </div>
  `;

  inner.querySelector("#nr-ac-confirm-btn")?.addEventListener("click", async () => {
    const picker      = inner.querySelector("#nr-ac-picker");
    const selectedId  = picker?.value ?? currentJobId;

    const btn = inner.querySelector("#nr-ac-confirm-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }

    // If user picked a pipeline job, load its full data; otherwise fall back to
    // the ctxHint job (came from Naukri page, not yet in DB) with no eval/resume.
    if (selectedId) {
      let job_ = currentJob, eval_ = evaluation, resume_ = resume;
      if (selectedId !== currentJobId) {
        const fresh = await fetchArtifacts(selectedId);
        if (fresh) { job_ = fresh.job; eval_ = fresh.evaluation; resume_ = fresh.resume; }
      }
      renderTabbedCard(selectedId, job_, eval_, resume_);
    } else if (currentJob) {
      // No pipeline jobId — open card with ctx job data only (fill tab works, eval/resume need save)
      renderTabbedCard(null, currentJob, null, null);
    }
  });
}

// ─── Tabbed card shell ────────────────────────────────────────────────────────

function renderTabbedCard(jobId, job, initialEvaluation, initialResume, { initialTab = "fill", autoRunEval = false } = {}) {
  const inner = _card?.querySelector("#nr-ac-inner");
  if (!inner) return null;

  // Shared mutable state — all tab renderers read from and write back to this
  // so switching tabs never loses data that was fetched or typed in a prior visit.
  const state = {
    evaluation:  initialEvaluation ?? null,
    resume:      initialResume     ?? null,
    coverLetter: "",               // preserves textarea text across tab switches
    autoRunEval,                   // eval tab auto-starts evaluation on first render
  };

  const dec = state.evaluation?.decision ?? "";

  inner.innerHTML = `
    <div class="nr-ac-job-bar">
      <div class="nr-ac-job-bar-info">
        <div class="nr-ac-jb-title">${esc(job?.title ?? "Unknown Role")}</div>
        <div class="nr-ac-jb-company">${esc(job?.company ?? "")}</div>
      </div>
      <span class="nr-ac-jb-score ${dec}" id="nr-ac-jb-score" style="${state.evaluation ? "" : "display:none"}">
        ${state.evaluation ? (state.evaluation.score ?? 0).toFixed(1) + "/5" : ""}
      </span>
    </div>
    <div class="nr-ac-tabs">
      <div class="nr-ac-tab ${initialTab === "fill"   ? "active" : ""}" data-tab="fill">Fill Form</div>
      <div class="nr-ac-tab ${initialTab === "eval"   ? "active" : ""}" data-tab="eval">Evaluation</div>
      <div class="nr-ac-tab ${initialTab === "resume" ? "active" : ""}" data-tab="resume">Resume</div>
      <div class="nr-ac-tab ${initialTab === "cover"  ? "active" : ""}" data-tab="cover">Cover Letter</div>
    </div>
    <div class="nr-ac-body" id="nr-ac-tab-body"></div>
  `;

  const tabBody = inner.querySelector("#nr-ac-tab-body");

  // Helper: update the score badge in the job bar whenever eval is set
  function refreshScoreBadge() {
    const badge = inner.querySelector("#nr-ac-jb-score");
    if (!badge) return;
    const ev = state.evaluation;
    if (ev) {
      badge.textContent = (ev.score ?? 0).toFixed(1) + "/5";
      badge.className   = `nr-ac-jb-score ${ev.decision ?? ""}`;
      badge.style.display = "";
    } else {
      badge.style.display = "none";
    }
  }

  // Expose tab switcher so external callers (backfill) can trigger re-renders
  state._switchTab = (tabKey) => {
    inner.querySelectorAll(".nr-ac-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tabKey);
    });
    switch (tabKey) {
      case "fill":   renderFillTab(tabBody, jobId, job);                           break;
      case "eval":   renderEvalTab(tabBody, jobId, job, state, refreshScoreBadge); break;
      case "resume": renderResumeTab(tabBody, jobId, job, state);                  break;
      case "cover":  renderCoverTab(tabBody, job, state);                          break;
    }
  };

  inner.querySelectorAll(".nr-ac-tab").forEach((tab) => {
    tab.addEventListener("click", () => state._switchTab(tab.dataset.tab));
  });

  // Render initial tab
  switch (initialTab) {
    case "eval":   renderEvalTab(tabBody, jobId, job, state, refreshScoreBadge); break;
    case "resume": renderResumeTab(tabBody, jobId, job, state);                  break;
    case "cover":  renderCoverTab(tabBody, job, state);                          break;
    default:       renderFillTab(tabBody, jobId, job);
  }

  return state; // expose so callers can update and trigger re-renders
}

// ─── Fill Form tab ────────────────────────────────────────────────────────────

async function renderFillTab(container, jobId, job) {
  _fieldVals = {};

  // ── Greenhouse fast path ───────────────────────────────────────────────────
  // Greenhouse is a single-page form — no steps, detect by hostname or form id.
  const isGreenhouse =
    /greenhouse\.io/.test(location.hostname) ||
    !!document.querySelector("#application-form");
  if (isGreenhouse) {
    renderGreenhouseHelper(container, jobId, job);
    return;
  }

  // ── Lever fast path ────────────────────────────────────────────────────────
  // jobs.lever.co/apply/<company>/<posting-id> — single-page form
  const isLever =
    /jobs\.lever\.co|lever\.co\/apply/.test(location.href) ||
    !!document.querySelector('input[name="resume"], .application-question');
  if (isLever) {
    renderLeverHelper(container, jobId, job);
    return;
  }

  // ── Ashby fast path ────────────────────────────────────────────────────────
  // jobs.ashbyhq.com/<company>/<posting-id>/application — single-page React form
  const isAshby =
    /jobs\.ashbyhq\.com/.test(location.href) ||
    !!document.querySelector('input[id^="_systemfield_"], .ashby-application-form-question');
  if (isAshby) {
    renderAshbyHelper(container, jobId, job);
    return;
  }

  // ── FAANG fast paths (each gets a branded helper, all share one filler) ────
  const faangCompany = detectFaangCompany();
  if (faangCompany) {
    renderFaangHelper(container, jobId, job, faangCompany);
    return;
  }

  // ── Survey forms + Easy-Apply overlays (Google/MS Forms, LinkedIn, Indeed) ─
  const overlayKind = detectSurveyOrOverlay();
  if (overlayKind) {
    renderSurveyOverlayHelper(container, jobId, job, overlayKind);
    return;
  }

  // ── Workday fast path ──────────────────────────────────────────────────────
  const isWorkday =
    /myworkdayjobs\.com|wd\d+\.myworkdayjobs\.com|workday\.com/.test(location.hostname) ||
    /myworkdayjobs\.com/.test(location.href);
  if (isWorkday) {
    renderWorkdayHelper(container, jobId, job, detectWorkdaySection());
    return;
  }
  // ───────────────────────────────────────────────────────────────────────────

  // ── Accenture fast path ─────────────────────────────────────────────────────
  // We already know the full form structure from the PDF — skip the scan
  // round-trip entirely and read the active step directly from the DOM.
  const isAccenturePrejoiner =
    location.hostname.includes("azurewebsites.net") &&
    !!document.querySelector(
      "app-candidate-details, app-upload-resume, app-additional-information, app-root",
    );
  if (isAccenturePrejoiner) {
    const stepEl =
      document.querySelector("mat-step-header.activeStep .mat-step-text-label") ??
      document.querySelector("mat-step-header[aria-selected='true'] .mat-step-text-label") ??
      document.querySelector(".mat-step-label-active .mat-step-text-label") ??
      document.querySelector("mat-step-header.cdk-program-focused .mat-step-text-label");
    const currentStep = stepEl?.textContent?.trim() ?? "unknown";
    renderAccentureHelper(container, jobId, job, currentStep);
    return;
  }
  // ───────────────────────────────────────────────────────────────────────────

  container.innerHTML = `
    <div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Scanning form fields…</div>
  `;

  const scanResult = await requestFieldScan();

  // Naukri sequential Q&A chatbot detected — switch to passive helper mode
  if (scanResult.naukriChatbotActive) {
    renderNaukriQAHelper(container, jobId, job);
    return;
  }

  // Fallback: scan returned accentureFormActive (e.g. from a cached scan)
  if (scanResult.accentureFormActive) {
    renderAccentureHelper(container, jobId, job, scanResult.accentureStep ?? "unknown");
    return;
  }

  const fields = scanResult.fields ?? [];

  if (fields.length === 0) {
    container.innerHTML = `
      <div class="nr-ac-empty">
        No fillable fields detected on this page.<br>
        <span style="font-size:11.5px;">Navigate to the application form, then click Re-scan.</span>
      </div>
      <button class="nr-ac-btn nr-ac-secondary nr-ac-full" id="nr-ac-rescan" style="margin-top:4px;">↻ Re-scan</button>
    `;
    container.querySelector("#nr-ac-rescan")?.addEventListener("click", () => renderFillTab(container, jobId, job));
    return;
  }

  const directFields = fields.filter((f) => f.kind === "direct");
  const selectFields = fields.filter((f) => f.kind === "select");
  const aiFields     = fields.filter((f) => f.kind === "ai");

  // Pre-populate values from profile
  fields.forEach((f) => { _fieldVals[f.id] = f.profileValue || f.currentValue || ""; });

  function buildRows() {
    const directHtml = directFields.map((f) => {
      const val = _fieldVals[f.id] ?? "";
      return `
        <div class="nr-ac-field-row">
          <div class="nr-ac-field-lbl" title="${esc(f.label)}">${esc(f.label.slice(0, 13))}</div>
          <div class="nr-ac-field-val">
            <input class="nr-ac-finput" data-fid="${esc(f.id)}" type="text"
              value="${esc(val)}" placeholder="—" />
          </div>
        </div>`;
    }).join("");

    const selectHtml = selectFields.map((f) => `
      <div class="nr-ac-field-row nr-ac-select-row">
        <div class="nr-ac-field-lbl" title="${esc(f.label)}">${esc(f.label.slice(0, 13))}</div>
        <div class="nr-ac-field-val">
          <div class="nr-ac-select-note">✓ Auto-select best option</div>
        </div>
      </div>`
    ).join("");

    const aiHtml = aiFields.map((f) => {
      const val = _fieldVals[f.id] ?? "";
      return `
        <div class="nr-ac-field-row nr-ac-ai">
          <div class="nr-ac-field-lbl" title="${esc(f.label)}">${esc(f.label.slice(0, 13))}</div>
          <div class="nr-ac-field-val">
            <textarea class="nr-ac-finput" data-fid="${esc(f.id)}" rows="2"
              placeholder="Click ✦ Generate…">${esc(val)}</textarea>
            <button class="nr-ac-gen-btn"
              data-fid="${esc(f.id)}"
              data-ftype="${esc(f.type)}"
              data-flabel="${esc(f.label)}"
            >✦ Generate</button>
          </div>
        </div>`;
    }).join("");

    const total = directFields.length + selectFields.length + aiFields.length;
    container.innerHTML = `
      <div class="nr-ac-hint">
        ${total} field${total !== 1 ? "s" : ""} detected
        ${selectFields.length ? ` · ${selectFields.length} dropdown${selectFields.length !== 1 ? "s" : ""} auto-selected` : ""}
        · Edit before applying
      </div>
      <div class="nr-ac-field-list">${directHtml}${selectHtml}${aiHtml}</div>
      <div class="nr-ac-row">
        <button class="nr-ac-btn nr-ac-secondary" id="nr-ac-rescan" style="flex:0 0 auto;padding:9px 12px;">↻ Re-scan</button>
        <button class="nr-ac-btn nr-ac-primary" id="nr-ac-write" style="flex:1;">Apply to Form</button>
      </div>
      <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-generic-autopilot" style="margin-top:8px;background:linear-gradient(90deg,#475569 0%,#0f172a 100%);">
        🚀 Auto-fill ALL steps (stops at Review)
      </button>
      <div id="nr-ac-generic-autopilot-status" style="display:none;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#f1f5f9;border:1px solid #cbd5e1;color:#1e293b;line-height:1.5;max-height:240px;overflow-y:auto;"></div>
      <div class="nr-ac-status" id="nr-ac-fill-status"></div>
    `;

    // Sync edits back to _fieldVals
    container.querySelectorAll(".nr-ac-finput").forEach((inp) => {
      inp.addEventListener("input", () => { _fieldVals[inp.dataset.fid] = inp.value; });
    });

    // ✦ Generate buttons
    container.querySelectorAll(".nr-ac-gen-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fid    = btn.dataset.fid;
        const ftype  = btn.dataset.ftype;
        const flabel = btn.dataset.flabel;
        btn.disabled = true;
        btn.textContent = "Generating…";

        const res = await swMsg({
          type: "FILL_SUGGEST",
          payload: {
            field_type:      ftype,
            field_label:     flabel,
            job_title:       job?.title       ?? "",
            company:         job?.company     ?? "",
            job_description: job?.description ?? "",
            current_value:   _fieldVals[fid]  ?? "",
          },
        });

        if (res?.ok && res.suggestion) {
          _fieldVals[fid] = res.suggestion;
          const ta = container.querySelector(`textarea[data-fid="${CSS.escape(fid)}"]`);
          if (ta) ta.value = res.suggestion;
          btn.textContent = "✦ Regenerate";
        } else {
          const errMsg = res?.upgrade
            ? "Upgrade to Pro for AI generation"
            : (res?.error ?? "Failed — try again").slice(0, 36);
          btn.textContent = errMsg;
          setTimeout(() => { btn.textContent = "✦ Generate"; }, 3000);
        }
        btn.disabled = false;
      });
    });

    // Re-scan
    container.querySelector("#nr-ac-rescan")?.addEventListener("click", () => {
      renderFillTab(container, jobId, job);
    });

    // Apply to Form
    container.querySelector("#nr-ac-write")?.addEventListener("click", () => {
      // Collect edited values
      container.querySelectorAll(".nr-ac-finput").forEach((inp) => {
        _fieldVals[inp.dataset.fid] = inp.value;
      });

      // Build write payload — direct & AI fields use the edited text value;
      // select fields just need their id present (auto-fill.js uses meta.kind to decide)
      const values = {};
      for (const [id, val] of Object.entries(_fieldVals)) {
        if (val?.trim()) values[id] = val.trim();
      }
      // Include select field IDs so auto-fill.js can call nativeFillSelect for them
      selectFields.forEach((f) => { values[f.id] = "__select__"; });

      const writeBtn = container.querySelector("#nr-ac-write");
      const status   = container.querySelector("#nr-ac-fill-status");
      if (writeBtn) { writeBtn.disabled = true; writeBtn.textContent = "Filling…"; }

      let done = false;
      const doneHandler = (e) => {
        if (done) return;
        done = true;
        document.removeEventListener("nr:write-done", doneHandler);
        const written = e.detail?.written ?? 0;
        if (status) status.textContent = `✓ ${written} field${written !== 1 ? "s" : ""} filled`;
        if (writeBtn) { writeBtn.disabled = false; writeBtn.textContent = "Apply to Form"; }
      };
      document.addEventListener("nr:write-done", doneHandler);
      document.dispatchEvent(new CustomEvent("nr:write", { detail: { values } }));

      // Fallback if write-done never fires (e.g. auto-fill.js not loaded)
      setTimeout(() => {
        if (!done) {
          done = true;
          document.removeEventListener("nr:write-done", doneHandler);
          if (writeBtn) { writeBtn.disabled = false; writeBtn.textContent = "Apply to Form"; }
          if (status) status.textContent = "Done (check fields manually)";
        }
      }, 4000);
    });
  }

  // ── Generic autopilot: loops scan→write→clickNext until Review ────────────
  const genericAutopilotBtn = container.querySelector("#nr-ac-generic-autopilot");
  const genericAutopilotStatus = container.querySelector("#nr-ac-generic-autopilot-status");
  if (genericAutopilotBtn && genericAutopilotStatus) {
    genericAutopilotBtn.addEventListener("click", async () => {
      genericAutopilotBtn.disabled = true;
      genericAutopilotBtn.textContent = "🚀 Running…";
      genericAutopilotStatus.style.display = "block";
      genericAutopilotStatus.textContent = "Starting…";

      // requestFill for the generic flow: re-scan the page, then write all
      // direct + select values via nr:write protocol. Files (resume, cover
      // letter) are NOT injected via the generic protocol — they ride along
      // through field-level uploads if any file input is in the form.
      const requestFill = async (/* resumeData, coverLetterData, tailorData */) => {
        return new Promise((resolve) => {
          const writeDoneHandler = (e) => {
            document.removeEventListener("nr:write-done", writeDoneHandler);
            const r = e.detail ?? { written: 0 };
            resolve({ filled: r.written ?? 0, skipped: 0, errors: [] });
          };
          const scanResHandler = (e2) => {
            document.removeEventListener("nr:scan-res", scanResHandler);
            const newFields = e2.detail?.fields ?? [];
            const values = {};
            for (const f of newFields) {
              if (f.profileValue) values[f.id] = f.profileValue;
              else if (f.kind === "select") values[f.id] = "__select__";
            }
            document.addEventListener("nr:write-done", writeDoneHandler);
            document.dispatchEvent(new CustomEvent("nr:write", { detail: { values } }));
          };
          document.addEventListener("nr:scan-res", scanResHandler);
          document.dispatchEvent(new CustomEvent("nr:scan-req"));
          setTimeout(() => {
            document.removeEventListener("nr:scan-res", scanResHandler);
            document.removeEventListener("nr:write-done", writeDoneHandler);
            resolve({ filled: 0, skipped: 0, errors: ["Scan/write timeout"] });
          }, 10000);
        });
      };

      const result = await runGenericMultiStepAutopilot({
        jobId, job,
        statusEl: genericAutopilotStatus,
        siteLabel: "Generic",
        requestFill,
        maxSteps: 12,
        preFetchFiles: false,
      });

      const ok = result.allErrors.length === 0;
      genericAutopilotStatus.innerHTML += `
        <div style="font-size:11px;line-height:1.6;margin-top:6px;border-top:1px solid #cbd5e1;padding-top:6px;">
          <strong>Total: ${result.totalFilled} filled · ${result.totalSkipped} skipped</strong>
          ${result.allErrors.length > 0
            ? `<br><strong style="color:#991b1b;">Issues:</strong><br>${result.allErrors.slice(0, 5).map((e) => `&nbsp;&nbsp;• ${esc(e)}`).join("<br>")}`
            : ""}
        </div>`;

      genericAutopilotBtn.disabled = false;
      genericAutopilotBtn.textContent = ok
        ? "🚀 Auto-fill ALL steps (stops at Review)"
        : "🔁 Run autopilot again";
    });
  }

  buildRows();
}

// ─── Greenhouse fill dispatcher ───────────────────────────────────────────────

function requestGreenhouseFill(resumeData = null, coverLetterData = null, tailorData = null) {
  return new Promise((resolve) => {
    const TIMEOUT_MS = 22000;
    let done = false;
    const handler = (e) => {
      if (done) return; done = true;
      document.removeEventListener("nr:greenhouse-fill-done", handler);
      resolve(e.detail ?? { filled: 0, skipped: 0, errors: [] });
    };
    document.addEventListener("nr:greenhouse-fill-done", handler);
    document.dispatchEvent(new CustomEvent("nr:greenhouse-fill", { detail: { resumeData, coverLetterData, tailorData } }));
    setTimeout(() => {
      if (done) return; done = true;
      document.removeEventListener("nr:greenhouse-fill-done", handler);
      resolve({ filled: 0, skipped: 0, errors: ["auto-fill.js did not respond (timeout)"] });
    }, TIMEOUT_MS);
  });
}

// ─── Greenhouse Application helper ────────────────────────────────────────────

async function renderGreenhouseHelper(container, jobId, job) {
  container.innerHTML = `<div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading profile…</div>`;

  const [res, evalCtx] = await Promise.all([
    swMsg({ type: "GET_PROFILE" }),
    loadEvalContext(),
  ]);
  const p = res?.profile ?? {};

  const firstName = p.first_name ?? (p.full_name ?? "").split(" ")[0] ?? "";
  const lastName  = p.last_name  ?? (p.full_name ?? "").split(" ").slice(1).join(" ") ?? "";

  // Determine which fields we can auto-fill vs. which need manual entry
  const autoRows = [
    ["First Name",        firstName   || "—"],
    ["Last Name",         lastName    || "—"],
    ["Email",             p.email     || "—"],
    ["Phone",             p.phone     || "—"],
    ["Country",           "India"],
    ["Resume",            jobId ? "✓ Will fetch generated resume" : "—  No job linked"],
    ["LinkedIn",          p.linkedin  || "—"],
    ["How did you hear",  "Job Board / Naukri"],
    ["Country (Q)",       "India"],
    ["Work eligible",     "Yes"],
    ["Work status",       "Citizen / Permanent Resident"],
    ["Non-compete",       "No"],
    ["Pronouns",          p.gender ? `Derived from profile (${p.gender})` : "Prefer not to say"],
    ["Portfolio link",    p.website   || "—"],
    ["BrightHire consent","Yes, I consent"],
    ["Privacy / GDPR",    "I Acknowledge / I Accept"],
    ["Demographic consent","Yes"],
    ["GDPR checkbox",     "✓ Will check"],
  ];

  const manualRows = [
    "Portfolio case study details (textarea)",
    "Design system contribution example (textarea)",
    "Any role-specific open-ended questions",
  ];

  function buildRows() {
    const autoHtml = autoRows.map(([label, val]) => `
      <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f0ede8;font-size:12px;">
        <span style="color:#6b6560;">${label}</span>
        <span style="color:#1a1814;font-weight:500;max-width:180px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${val}</span>
      </div>`).join("");

    const manualHtml = manualRows.map((m) => `
      <div style="display:flex;align-items:flex-start;gap:5px;padding:2px 0;font-size:12px;color:#6b6560;">
        <span style="margin-top:1px;">✏️</span><span>${m}</span>
      </div>`).join("");

    container.innerHTML = `
      <div style="padding:10px 14px;overflow-y:auto;max-height:100%;">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">
          <span style="font-size:18px;">📋</span>
          <div>
            <div style="font-weight:600;font-size:13px;">Greenhouse Application</div>
            <div style="font-size:11px;color:#6b6560;">${job?.title ?? "This role"} · Single-page form</div>
          </div>
        </div>

        <div style="background:#f9f7f4;border:1px solid #e8e4de;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:600;color:#6b6560;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Will auto-fill</div>
          ${autoHtml}
        </div>

        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">Needs manual input</div>
          ${manualHtml}
        </div>

        ${buildEvalPickerHtml({
          tier:           evalCtx.tier,
          autoMatch:      evalCtx.autoMatch,
          recent:         evalCtx.recent,
          state:          evalCtx.state,
          tailorUsesToday: evalCtx.tailorUsesToday,
        })}

        <button id="nr-gh-fill-btn" style="width:100%;padding:9px;background:#c84a1f;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.02em;">
          ⚡ Fill This Form
        </button>
        <div id="nr-gh-result" style="display:none;margin-top:8px;"></div>
      </div>`;

    const btn = container.querySelector("#nr-gh-fill-btn");
    const resultEl = container.querySelector("#nr-gh-result");

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "⏳ Filling…";
      resultEl.style.display = "none";

      // Fetch resume + cover letter + tailor (if enabled) in parallel.
      const tailorState = await loadTailorState();
      const tailorPromise = tailorState.tailor_enabled
        ? (btn.textContent = "✨ Tailoring with AI…", runTailorIfEnabled({ jobId, job }))
        : Promise.resolve(null);

      const [resumeData, coverLetterData, tailorResult] = await Promise.all([
        fetchResumeBlob(jobId),
        fetchCoverLetterBlob(),
        tailorPromise,
      ]);

      if (!resumeData) {
        resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;";
        resultEl.innerHTML = "⚠️ No resume available. <a href='" + (NEXTROLE_URL ?? "") + "/dashboard/profile#section-resume' target='_blank' style='color:inherit;text-decoration:underline;'>Upload one</a> or generate a tailored resume first.";
        btn.disabled = false;
        btn.textContent = "⚡ Fill This Form";
        return;
      }

      btn.textContent = "⏳ Filling…";
      const res = await requestGreenhouseFill(resumeData, coverLetterData, tailorResult);

      const hasErrors = res.errors && res.errors.length > 0;
      const color = res.filled > 0 && !hasErrors ? "#f0fdf4" : res.filled > 0 ? "#fefce8" : "#fef2f2";
      const border = res.filled > 0 && !hasErrors ? "#bbf7d0" : res.filled > 0 ? "#fde68a" : "#fecaca";
      const text   = res.filled > 0 && !hasErrors ? "#166534" : res.filled > 0 ? "#92400e" : "#991b1b";

      resultEl.style.cssText = `display:block;padding:8px 10px;border-radius:8px;font-size:12px;background:${color};border:1px solid ${border};color:${text};`;
      resultEl.innerHTML = `
        <strong>✓ ${res.filled} filled · ${res.skipped} skipped</strong>
        ${hasErrors ? `<ul style="margin:4px 0 0 14px;padding:0;font-size:11px;">${res.errors.map((e) => `<li>${e}</li>`).join("")}</ul>` : ""}`;

      btn.disabled = false;
      btn.textContent = "⚡ Fill Again";
    });
  }

  buildRows();
  wireEvalPicker(container, evalCtx.state);
}

// ─── Lever / Ashby fill dispatchers ──────────────────────────────────────────

function requestLeverFill(resumeData, coverLetterData, tailorData) {
  return new Promise((resolve) => {
    const TIMEOUT_MS = 18000;
    let done = false;
    const handler = (e) => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:lever-fill-done", handler);
      resolve(e.detail ?? { filled: 0, skipped: 0, errors: [] });
    };
    document.addEventListener("nr:lever-fill-done", handler);
    document.dispatchEvent(new CustomEvent("nr:lever-fill", {
      detail: { resumeData, coverLetterData, tailorData },
    }));
    setTimeout(() => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:lever-fill-done", handler);
      resolve({ filled: 0, skipped: 0, errors: ["Timed out"] });
    }, TIMEOUT_MS);
  });
}

function requestAshbyFill(resumeData, coverLetterData, tailorData) {
  return new Promise((resolve) => {
    const TIMEOUT_MS = 20000;
    let done = false;
    const handler = (e) => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:ashby-fill-done", handler);
      resolve(e.detail ?? { filled: 0, skipped: 0, errors: [] });
    };
    document.addEventListener("nr:ashby-fill-done", handler);
    document.dispatchEvent(new CustomEvent("nr:ashby-fill", {
      detail: { resumeData, coverLetterData, tailorData },
    }));
    setTimeout(() => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:ashby-fill-done", handler);
      resolve({ filled: 0, skipped: 0, errors: ["Timed out"] });
    }, TIMEOUT_MS);
  });
}

// ─── Simple single-page helper UI shared by Lever + Ashby ───────────────────

async function renderSimpleHelper(opts) {
  const {
    container, jobId, job, ats, accent, requestFill,
    optionalResume = false,
    multiStep      = false,
  } = opts;

  container.innerHTML = `<div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading profile…</div>`;

  const [res, evalCtx] = await Promise.all([
    swMsg({ type: "GET_PROFILE" }),
    loadEvalContext(),
  ]);
  const p = res?.profile ?? {};

  const summary = [
    ["Name",     p.full_name  || "—"],
    ["Email",    p.email      || "—"],
    ["Phone",    p.phone      || "—"],
    ["Location", p.city ?? p.location ?? "—"],
    ["LinkedIn", p.linkedin   || "—"],
    ["GitHub",   p.github     || "—"],
    ["Resume",   "✓ Auto-uploads from your profile"],
    ["Cover letter", p.has_cover_letter ? "✓ Auto-uploads" : "AI-tailored when toggle is on"],
    ["Work auth", p.sponsorship_needed ? "Yes — needs sponsorship" : "Yes — no sponsorship needed"],
    ["Relocate", p.willing_to_relocate === false ? "No" : "Yes"],
    ["Demographics (EEO)", "From profile or 'Prefer not to say'"],
  ];

  const summaryHtml = summary.map(([k, v]) => `
    <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f0ede8;font-size:12px;">
      <span style="color:#6b6560;">${esc(k)}</span>
      <span style="color:#1a1814;font-weight:500;max-width:200px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(v)}</span>
    </div>`).join("");

  container.innerHTML = `
    <div style="padding:10px 14px;overflow-y:auto;max-height:100%;">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">
        <span style="font-size:18px;">⚡</span>
        <div>
          <div style="font-weight:600;font-size:13px;">${esc(ats)} Application</div>
          <div style="font-size:11px;color:#6b6560;">${esc(job?.title ?? "This role")} · Single-page form</div>
        </div>
      </div>

      <div style="background:#f9f7f4;border:1px solid #e8e4de;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
        <div style="font-size:11px;font-weight:600;color:#6b6560;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Will auto-fill</div>
        ${summaryHtml}
      </div>

      ${buildEvalPickerHtml({
        tier:           evalCtx.tier,
        autoMatch:      evalCtx.autoMatch,
        recent:         evalCtx.recent,
        state:          evalCtx.state,
        tailorUsesToday: evalCtx.tailorUsesToday,
      })}

      <button id="nr-fill-btn" style="width:100%;padding:9px;background:${accent};color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.02em;">
        ⚡ Fill ${multiStep ? "This Step" : "This Form"}
      </button>
      ${multiStep ? `
        <button class="nr-ac-btn" id="nr-autopilot-btn" style="width:100%;padding:9px;margin-top:6px;background:linear-gradient(90deg,${accent} 0%,${accent}cc 100%);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.02em;">
          🚀 Auto-fill ALL steps (stops at Review)
        </button>
        <div id="nr-autopilot-status" style="display:none;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#f0f4ff;border:1px solid #c7d2fe;color:#3730a3;line-height:1.5;max-height:240px;overflow-y:auto;"></div>
      ` : ""}
      <div id="nr-fill-result" style="display:none;margin-top:8px;"></div>
    </div>`;

  wireEvalPicker(container, evalCtx.state);

  const btn      = container.querySelector("#nr-fill-btn");
  const resultEl = container.querySelector("#nr-fill-result");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "⏳ Filling…";
    resultEl.style.display = "none";

    // Tailor + file fetch in parallel
    const tailorState = await loadTailorState();
    const tailorPromise = tailorState.tailor_enabled
      ? (btn.textContent = "✨ Tailoring with AI…", runTailorIfEnabled({ jobId, job }))
      : Promise.resolve(null);
    const [resumeData, coverLetterData, tailorData] = await Promise.all([
      fetchResumeBlob(jobId),
      fetchCoverLetterBlob(),
      tailorPromise,
    ]);

    if (!resumeData && !optionalResume) {
      resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;";
      resultEl.innerHTML = `⚠️ No resume available. <a href="#" id="nr-fill-upload-link" style="color:inherit;text-decoration:underline;">Upload one in your profile</a>.`;
      container.querySelector("#nr-fill-upload-link")?.addEventListener("click", (ev) => {
        ev.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/profile#section-resume` });
      });
      btn.disabled = false;
      btn.textContent = "⚡ Fill This Form";
      return;
    }

    btn.textContent = "⏳ Filling…";
    const r = await requestFill(resumeData, coverLetterData, tailorData);

    const hasErrors = r.errors && r.errors.length > 0;
    const color  = r.filled > 0 && !hasErrors ? "#f0fdf4" : r.filled > 0 ? "#fefce8" : "#fef2f2";
    const border = r.filled > 0 && !hasErrors ? "#bbf7d0" : r.filled > 0 ? "#fde68a" : "#fecaca";
    const text   = r.filled > 0 && !hasErrors ? "#166534" : r.filled > 0 ? "#92400e" : "#991b1b";

    // ── Post-fill validation scan ──────────────────────────────────────────
    // Look for any aria-invalid="true" or .error markers near labels — surface
    // them so the user knows which fields the form rejected.
    let validationHtml = "";
    setTimeout(() => {
      const invalid = [...document.querySelectorAll('[aria-invalid="true"]:not([type="hidden"]), .has-error input, .error input')];
      if (invalid.length > 0) {
        const items = invalid.slice(0, 5).map((el) => {
          const lbl = (el.getAttribute("aria-label") ?? el.placeholder ?? el.name ?? "field").slice(0, 50);
          return `<li>${esc(lbl)}</li>`;
        }).join("");
        validationHtml = `<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:11px;">
          ⚠ Form flagged ${invalid.length} field${invalid.length !== 1 ? "s" : ""} as invalid — review:
          <ul style="margin:3px 0 0 14px;padding:0;">${items}</ul>
        </div>`;
        resultEl.innerHTML += validationHtml;
      }
    }, 800);

    resultEl.style.cssText = `display:block;padding:8px 10px;border-radius:8px;font-size:12px;background:${color};border:1px solid ${border};color:${text};`;
    resultEl.innerHTML = `
      <strong>✓ ${r.filled} filled · ${r.skipped} skipped</strong>
      ${hasErrors ? `<ul style="margin:4px 0 0 14px;padding:0;font-size:11px;">${r.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}`;

    btn.disabled = false;
    btn.textContent = multiStep ? "⚡ Fill This Step Again" : "⚡ Fill Again";
  });

  // ── Autopilot button (multi-step sites only) ────────────────────────────────
  const autopilotBtn = container.querySelector("#nr-autopilot-btn");
  const autopilotStatus = container.querySelector("#nr-autopilot-status");
  if (autopilotBtn && autopilotStatus) {
    autopilotBtn.addEventListener("click", async () => {
      autopilotBtn.disabled = true;
      autopilotBtn.textContent = "🚀 Running…";
      btn.disabled = true;
      autopilotStatus.style.display = "block";
      autopilotStatus.style.color = "#3730a3";
      autopilotStatus.textContent = "Starting…";

      const stepLog = [];
      const result = await runGenericMultiStepAutopilot({
        jobId, job,
        statusEl: autopilotStatus,
        siteLabel: ats,
        requestFill: (rd, cd, td) => {
          stepLog.push(`Step ${stepLog.length + 1}`);
          return requestFill(rd, cd, td);
        },
        preFetchFiles: !optionalResume,
        requireResume: !optionalResume,
      });

      const ok = result.allErrors.length === 0;
      const summary = `
        <div style="font-size:11px;line-height:1.6;margin-top:6px;border-top:1px solid #c7d2fe;padding-top:6px;">
          <strong>Total: ${result.totalFilled} filled · ${result.totalSkipped} skipped across ${stepLog.length} step${stepLog.length !== 1 ? "s" : ""}</strong>
          ${result.allErrors.length > 0
            ? `<br><strong style="color:#991b1b;">Issues:</strong><br>${result.allErrors.slice(0, 5).map((e) => `&nbsp;&nbsp;• ${esc(e)}`).join("<br>")}`
            : ""}
        </div>`;
      autopilotStatus.innerHTML += summary;

      autopilotBtn.disabled = false;
      btn.disabled = false;
      autopilotBtn.textContent = ok ? "🚀 Auto-fill ALL steps (stops at Review)" : "🔁 Run autopilot again";
    });
  }
}

function renderLeverHelper(container, jobId, job) {
  return renderSimpleHelper({
    container, jobId, job,
    ats: "Lever",
    accent: "#5a3eb5",
    requestFill: requestLeverFill,
  });
}

function renderAshbyHelper(container, jobId, job) {
  return renderSimpleHelper({
    container, jobId, job,
    ats: "Ashby",
    accent: "#3b3d57",
    requestFill: requestAshbyFill,
  });
}

// ─── FAANG career-page detection + dispatch ─────────────────────────────────
//
// Each company gets a branded helper UI but they all share `_fillFaangGeneric`
// (with per-company selector overrides) on the content-script side.

const FAANG_REGISTRY = {
  amazon: {
    label: "Amazon",
    accent: "#ff9900",
    hostnames: [/\.amazon\.jobs$/, /^amazon\.jobs$/, /hiring\.amazon\.com/, /amazon\.dejobs\.org/],
    note: "amazon.jobs · Corporate application",
  },
  meta: {
    label: "Meta",
    accent: "#1877f2",
    hostnames: [/^(www\.)?metacareers\.com$/, /careers\.meta\.com/, /facebook\.com\/careers/],
    note: "Meta Careers · React app",
  },
  google: {
    label: "Google",
    accent: "#4285f4",
    hostnames: [/careers\.google\.com/, /google\.com\/about\/careers/],
    note: "Google Careers · Material-design form",
  },
  apple: {
    label: "Apple",
    accent: "#000000",
    hostnames: [/jobs\.apple\.com/],
    note: "Apple Jobs · Multi-step form",
  },
  microsoft: {
    label: "Microsoft",
    accent: "#0078d4",
    hostnames: [/careers\.microsoft\.com/, /jobs\.careers\.microsoft\.com/],
    note: "Microsoft Careers · Custom form",
  },
};

function detectFaangCompany() {
  const host = location.hostname.toLowerCase();
  for (const [key, cfg] of Object.entries(FAANG_REGISTRY)) {
    if (cfg.hostnames.some((re) => re.test(host)) || cfg.hostnames.some((re) => re.test(location.href))) {
      return key;
    }
  }
  return null;
}

function requestFaangFill(company, resumeData, coverLetterData, tailorData) {
  return new Promise((resolve) => {
    const TIMEOUT_MS = 20000;
    let done = false;
    const handler = (e) => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:faang-fill-done", handler);
      resolve(e.detail ?? { filled: 0, skipped: 0, errors: [] });
    };
    document.addEventListener("nr:faang-fill-done", handler);
    document.dispatchEvent(new CustomEvent("nr:faang-fill", {
      detail: { company, resumeData, coverLetterData, tailorData },
    }));
    setTimeout(() => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:faang-fill-done", handler);
      resolve({ filled: 0, skipped: 0, errors: ["Timed out"] });
    }, TIMEOUT_MS);
  });
}

function renderFaangHelper(container, jobId, job, company) {
  const cfg = FAANG_REGISTRY[company];
  return renderSimpleHelper({
    container, jobId, job,
    ats: cfg.label,
    accent: cfg.accent,
    requestFill: (resumeData, coverLetterData, tailorData) =>
      requestFaangFill(company, resumeData, coverLetterData, tailorData),
    multiStep: true,    // FAANG forms are multi-step wizards
  });
}

// ─── Survey forms + Easy Apply overlays (Google/MS Forms, LinkedIn, Indeed) ─

function _makeFillRequester(eventName, includeFiles = true) {
  return function (resumeData, coverLetterData, tailorData) {
    return new Promise((resolve) => {
      const doneEv = `${eventName}-done`;
      let done = false;
      const handler = (e) => {
        if (done) return;
        done = true;
        document.removeEventListener(doneEv, handler);
        resolve(e.detail ?? { filled: 0, skipped: 0, errors: [] });
      };
      document.addEventListener(doneEv, handler);
      const detail = { tailorData };
      if (includeFiles) { detail.resumeData = resumeData; detail.coverLetterData = coverLetterData; }
      document.dispatchEvent(new CustomEvent(eventName, { detail }));
      setTimeout(() => {
        if (done) return;
        done = true;
        document.removeEventListener(doneEv, handler);
        resolve({ filled: 0, skipped: 0, errors: ["Timed out"] });
      }, 18000);
    });
  };
}

const requestGoogleFormsFill    = _makeFillRequester("nr:gforms-fill",    false);
const requestMicrosoftFormsFill = _makeFillRequester("nr:msforms-fill",   false);
const requestLinkedInFill       = _makeFillRequester("nr:linkedin-fill",  true);
const requestIndeedFill         = _makeFillRequester("nr:indeed-fill",    true);

function detectSurveyOrOverlay() {
  const h = location.hostname.toLowerCase();
  const href = location.href.toLowerCase();
  if (/docs\.google\.com\/forms/.test(href) || /forms\.gle/.test(h)) return "gforms";
  if (/forms\.office\.com|forms\.microsoft\.com/.test(h))            return "msforms";
  if (/linkedin\.com\/jobs/.test(h) && document.querySelector('div[role="dialog"]')) return "linkedin";
  if (/apply\.indeed\.com|indeed\.com\/.*apply/.test(href))          return "indeed";
  return null;
}

const SURVEY_OVERLAY_REGISTRY = {
  gforms:   { label: "Google Forms",     accent: "#673ab7", request: requestGoogleFormsFill,    requiresFiles: false },
  msforms:  { label: "Microsoft Forms",  accent: "#7719aa", request: requestMicrosoftFormsFill, requiresFiles: false },
  linkedin: { label: "LinkedIn Easy Apply", accent: "#0a66c2", request: requestLinkedInFill,    requiresFiles: true  },
  indeed:   { label: "Indeed Apply",     accent: "#003a9b", request: requestIndeedFill,         requiresFiles: true  },
};

function renderSurveyOverlayHelper(container, jobId, job, kind) {
  const cfg = SURVEY_OVERLAY_REGISTRY[kind];
  return renderSimpleHelper({
    container, jobId, job,
    ats: cfg.label,
    accent: cfg.accent,
    requestFill: cfg.request,
    optionalResume: !cfg.requiresFiles,
  });
}

// ─── Workday fill dispatcher ──────────────────────────────────────────────────

function requestWorkdayFill(section, resumeData = null, coverLetterData = null, tailorData = null) {
  return new Promise((resolve) => {
    const TIMEOUT_MS = 20000;
    let done = false;
    const handler = (e) => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:workday-fill-done", handler);
      resolve(e.detail ?? { filled: 0, skipped: 0, errors: [] });
    };
    document.addEventListener("nr:workday-fill-done", handler);
    document.dispatchEvent(new CustomEvent("nr:workday-fill", { detail: { section, resumeData, coverLetterData, tailorData } }));
    setTimeout(() => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:workday-fill-done", handler);
      resolve({ filled: 0, skipped: 0, errors: ["auto-fill.js did not respond (timeout)"] });
    }, TIMEOUT_MS);
  });
}

// ─── Workday section detection (shared by single-step + autopilot) ──────────
//
// Detects the current section by inspecting page-level data-automation-id
// markers; falls back to field-level selectors and finally the task header.

function detectWorkdaySection() {
  // PRIMARY: read the active step label from Workday's progress bar.
  // Confirmed on Walmart wd5 instance (May 2026):
  //   <li data-automation-id="progressBarActiveStep">
  //     <label class="...">Review</label>
  //   </li>
  // The first <label> NOT carrying aria-live="polite" is the visible step name.
  const progressLabels = document.querySelectorAll(
    'li[data-automation-id="progressBarActiveStep"] label'
  );
  for (const lbl of progressLabels) {
    if (lbl.getAttribute("aria-live")) continue;          // skip "current step N of M"
    const raw = lbl.textContent?.trim();
    if (!raw) continue;
    // Walmart names sub-pages "Application Questions 1 of 2" / "2 of 2" —
    // collapse to the canonical "Application Questions".
    const stripped = raw.replace(/\s*\d+\s*of\s*\d+\s*$/i, "").trim();
    // Aliases used by different companies:
    if (/voluntary\s*disclosure/i.test(stripped))         return "Self Identify";
    if (/personal\s*information/i.test(stripped))         return "Self Identify";   // some instances
    return stripped;
  }

  // FALLBACKS: page-level data-automation-id wrappers (older Workday flow)
  if (document.querySelector('[data-automation-id="applyFlowMyInfoPage"]') ||
      document.querySelector('input[name="legalName--firstName"]')) {
    return "My Information";
  }
  if (document.querySelector(
    '[data-automation-id="applyFlowMyExperiencePage"], ' +
    '[data-automation-id="resumeSection"], [data-automation-id="resumeLabel"], ' +
    '[data-automation-id="file-upload-input"], ' +
    '[data-automation-id="workExperienceSection"], ' +
    '[data-automation-id="educationSection"], ' +
    '[data-automation-id="certificationSection"]'
  )) return "My Experience";

  if (document.querySelector(
    '[data-automation-id="applyFlowSelfIdentifyPage"], ' +
    '[data-automation-id="selfIdentify"], [data-automation-id="genderIdentityDropdown"], ' +
    '[data-automation-id="ethnicityDropdown"], button[name="gender"], button[name="nationality"]'
  )) return "Self Identify";

  if (document.querySelector(
    '[data-automation-id="applyFlowApplicationQuestionsPage"], ' +
    '[data-automation-id="questionnaire"]'
  )) return "Application Questions";

  if (document.querySelector(
    '[data-automation-id="applyFlowReviewPage"], ' +
    '[data-automation-id="reviewSection"], [data-automation-id="review--workExperience"]'
  )) return "Review";

  return document.querySelector(
    '[data-automation-id="wd-TaskHeader"] h2, [data-automation-id="wd-TaskHeader"] h1, ' +
    '[data-automation-id="applicationTitle"]'
  )?.textContent?.trim() ?? "unknown";
}

// ─── Workday "Save and Continue" button locator ─────────────────────────────

function _wdFindNextButton() {
  // SAFETY: Walmart and other Workday tenants reuse data-automation-id="pageFooterNextButton"
  // for BOTH "Save and Continue" AND "Submit" on the Review page. We must never click Submit
  // from autopilot — the user reviews and submits manually.
  const _isSubmitText = (el) => {
    const t = (el?.innerText ?? el?.textContent ?? "").trim().toLowerCase();
    return /^submit\b|^submit\s*application$/.test(t);
  };

  // Primary: Workday's canonical next-button automation IDs (but reject if labelled Submit)
  const idCandidates = document.querySelectorAll(
    '[data-automation-id="bottom-navigation-next-button"], ' +
    '[data-automation-id="pageFooterNextButton"], ' +
    '[data-automation-id="wizardNavigationNextButton"]'
  );
  for (const btn of idCandidates) {
    if (btn.disabled) continue;
    if (_isSubmitText(btn)) continue;
    return btn;
  }

  // Fallback: any visible button whose text says "Save and Continue" / "Continue" / "Next"
  const candidates = [...document.querySelectorAll("button:not([disabled])")];
  return candidates.find((b) => {
    if (_isSubmitText(b)) return false;
    const txt = (b.innerText ?? b.textContent ?? "").trim().toLowerCase();
    return /^save\s*(and|&)?\s*continue$|^continue$|^next$|^save\s*and\s*continue$/.test(txt);
  }) ?? null;
}

// Wait for the section to change away from `currentSection`. Polls every 350ms.
async function _wdWaitForSectionChange(currentSection, timeoutMs = 9000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 350));
    const now = detectWorkdaySection();
    if (now && now !== currentSection && now !== "unknown") return now;
  }
  return null;
}

// ─── Workday autopilot: fill section → continue → repeat until Review ───────

async function runWorkdayAutopilot({ jobId, job, statusEl, onStepResult }) {
  const MAX_SECTIONS = 12;             // safety cap
  const visited     = new Set();        // detect loops
  let totalFilled    = 0;
  let totalSkipped   = 0;
  const allErrors    = [];
  const isAborted    = () => statusEl && !statusEl.isConnected;

  // Pre-flight: connection check
  const sessionRes = await swMsg({ type: "GET_SESSION" });
  if (!sessionRes?.ok || !sessionRes?.loggedIn) {
    if (statusEl) {
      statusEl.style.color = "#991b1b";
      statusEl.innerHTML = `⚠ Not connected to NextRole. <a href="#" id="nr-wd-connect" style="color:inherit;text-decoration:underline;">Sign in</a> first.`;
      statusEl.querySelector("#nr-wd-connect")?.addEventListener("click", (ev) => {
        ev.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/login` });
      });
    }
    return { totalFilled: 0, totalSkipped: 0, allErrors: ["Not signed in"] };
  }

  // 1. Pre-fetch tailor + files ONCE — reuse across every section
  const tailorState = await loadTailorState();
  let resumeData = null, coverLetterData = null, tailorData = null;

  if (tailorState.tailor_enabled) {
    if (statusEl) statusEl.textContent = "✨ Tailoring once for the whole application…";
    const tailorResult = await runTailorIfEnabled({ jobId, job });
    if (tailorResult?.__tailorError) {
      let label = tailorResult.message ?? "Tailor failed";
      if (tailorResult.cap_reached)              label = "Daily tailor limit reached. Continuing without AI tailoring.";
      else if (tailorResult.insufficient_credits) label = "Not enough credits for tailoring. Continuing without it.";
      else if (tailorResult.upgrade)             label = "AI tailoring is a Starter+ feature. Continuing without it.";
      if (statusEl) {
        statusEl.innerHTML = `⚠ ${esc(label)}`;
        await new Promise((r) => setTimeout(r, 1800));
      }
      tailorData = null;
      allErrors.push(`Tailor: ${tailorResult.message}`);
    } else {
      tailorData = tailorResult;
    }
  }

  if (isAborted()) return { totalFilled, totalSkipped, allErrors: ["Aborted by user"] };

  // 2. Loop sections
  for (let step = 1; step <= MAX_SECTIONS; step++) {
    if (isAborted()) { allErrors.push("Aborted (panel closed)"); break; }

    // Captcha halt
    if (_detectCaptcha()) {
      if (statusEl) {
        statusEl.style.color = "#92400e";
        statusEl.innerHTML = `🤖 CAPTCHA detected — solve it manually, then re-run autopilot`;
      }
      allErrors.push(`Step ${step}: captcha required`);
      break;
    }

    const section = detectWorkdaySection();

    if (!section || section === "unknown") {
      allErrors.push(`Step ${step}: couldn't detect section — stopping`);
      break;
    }
    if (section === "Review") {
      if (statusEl) {
        statusEl.style.color = "#166534";
        statusEl.innerHTML = `🎉 Reached <strong>Review</strong> — verify everything and click <strong>Submit</strong> yourself`;
      }
      break;
    }
    if (visited.has(section)) {
      allErrors.push(`Loop detected at "${section}" — stopping`);
      break;
    }
    visited.add(section);

    if (statusEl) statusEl.innerHTML = `📋 Step ${step}: filling <strong>${esc(section)}</strong>…`;

    // Resume + cover letter only needed for "My Experience". Fetch on demand.
    if (section === "My Experience" && !resumeData) {
      [resumeData, coverLetterData] = await Promise.all([
        fetchResumeBlob(jobId),
        fetchCoverLetterBlob(),
      ]);
      if (!resumeData) {
        allErrors.push(`No resume available for My Experience — stopping`);
        if (statusEl) statusEl.innerHTML = `⚠ No resume uploaded. <a href="#" id="nr-wd-up" style="color:inherit;text-decoration:underline;">Upload one</a> and re-run.`;
        statusEl?.querySelector("#nr-wd-up")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/profile#section-resume` });
        });
        break;
      }
    }

    const r = await requestWorkdayFill(section, resumeData, coverLetterData, tailorData);
    totalFilled  += r.filled;
    totalSkipped += r.skipped;
    if (r.errors?.length) allErrors.push(...r.errors.map((e) => `${section}: ${e}`));
    if (typeof onStepResult === "function") onStepResult(step, section, r);

    // Let React update + Workday's own validation kick in
    await new Promise((res) => setTimeout(res, 700));

    // Detect any validation errors that would block "Continue"
    const invalid = document.querySelectorAll('[aria-invalid="true"]:not([type="hidden"])');
    if (invalid.length > 0) {
      const labels = [...invalid].slice(0, 3).map((el) =>
        (el.getAttribute("aria-label") ?? el.placeholder ?? el.name ?? "field").slice(0, 40)
      );
      if (statusEl) {
        statusEl.style.color = "#991b1b";
        statusEl.innerHTML = `⚠ <strong>${section}</strong>: ${invalid.length} field${invalid.length !== 1 ? "s" : ""} flagged invalid — review and re-run.<br><span style="font-size:11px;">${labels.map(esc).join(", ")}</span>`;
      }
      allErrors.push(`${section}: ${invalid.length} validation errors`);
      break;
    }

    // Click Save and Continue
    const nextBtn = _wdFindNextButton();
    if (!nextBtn) {
      if (statusEl) statusEl.innerHTML = `⚠ Couldn't find <strong>Save and Continue</strong> on ${esc(section)} — finish manually`;
      allErrors.push(`${section}: no continue button found`);
      break;
    }

    if (statusEl) statusEl.innerHTML = `↪ Clicking <strong>Save and Continue</strong>…`;
    nextBtn.click();

    // Wait for section to change (React route swap on Workday SPA)
    const newSection = await _wdWaitForSectionChange(section, 12000);
    if (!newSection) {
      if (statusEl) statusEl.innerHTML = `⚠ Page didn't advance after <strong>${esc(section)}</strong> — Workday may still be validating. Try again or continue manually.`;
      allErrors.push(`${section}: continue didn't navigate`);
      break;
    }
    // Loop continues with the new section detected on next iteration
  }

  return { totalFilled, totalSkipped, allErrors };
}

// ─── Generic multi-step autopilot (works on FAANG + iCIMS + SAP + Oracle + …)
//
// Heuristic loop that:
//   1. Fills the current page using a caller-supplied requestFill function
//   2. Looks for a "Save and Continue" / "Next" button
//   3. Clicks it, waits for the page to change, repeats
//   4. Stops the moment the heading/buttons indicate a Review/Submit step
//   5. NEVER auto-clicks a Submit button — user always reviews & submits

// Match Continue/Next-style buttons. Excludes Submit so we never advance past
// the review screen.
const _NEXT_BTN_RE = /^(save\s*(?:and|&)?\s*continue|continue|next(?:\s+step)?|save\s*&?\s*next|proceed|forward|continue\s+to)$/i;
const _SUBMIT_BTN_RE = /submit\s*application|apply\s*now|finish\s*application|complete\s*application|^submit$/i;

// Buttons whose text suggests the user is opting OUT of something or going
// backwards. We never click these in autopilot.
const _SKIP_BACK_RE = /^(skip|back|cancel|continue\s+without|skip\s+for\s+now|maybe\s+later|not\s+now|previous|sign\s+in\s+with)/i;

function _findGenericNextButton(scope = document) {
  // Collect every enabled, visible candidate
  const all = [...scope.querySelectorAll(
    "button:not([disabled]), input[type='submit']:not([disabled]), input[type='button']:not([disabled])"
  )].filter((b) => {
    // Visible check — skip elements with display:none / 0 size
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  // Score each candidate; higher = more likely to be the primary continue
  const scored = all.map((b) => {
    const txt = (b.innerText ?? b.value ?? "").trim();
    const txtLow = txt.toLowerCase();
    const attrs = `${b.getAttribute("data-automation-id") ?? ""} ${b.getAttribute("data-testid") ?? ""} ${b.className ?? ""}`.toLowerCase();

    if (_SUBMIT_BTN_RE.test(txt)) return { btn: b, score: -1000 };  // never
    if (_SKIP_BACK_RE.test(txt))  return { btn: b, score: -500 };   // never

    let score = 0;
    if (_NEXT_BTN_RE.test(txt))                       score += 100;
    if (/\bnext\b|\bcontinue\b/.test(attrs))          score += 60;
    if (/primary|nav-next|cta\b|btn-primary/.test(attrs)) score += 30;
    if (b.type === "submit")                          score += 20;
    if (/save\s*(and|&)?\s*continue/.test(txtLow))    score += 50;

    // Slight preference for buttons in the bottom-right (canonical Next placement)
    const r = b.getBoundingClientRect();
    if (r.bottom > window.innerHeight * 0.5)          score += 10;

    return { btn: b, score };
  }).filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.btn ?? null;
}

// CAPTCHA detection — halt the autopilot loop, user solves manually.
function _detectCaptcha() {
  return !!document.querySelector(
    'iframe[src*="recaptcha" i], iframe[title*="recaptcha" i], ' +
    'iframe[src*="hcaptcha" i], iframe[title*="cloudflare" i], ' +
    'div.g-recaptcha:not(:empty), div.h-captcha:not(:empty), ' +
    '[data-callback*="captcha" i]'
  );
}

// Detect generic "Are you sure?" confirmation modals that appear AFTER a
// Continue click. Look for a small dialog with Yes/No or OK/Cancel buttons.
function _detectModalConfirmation() {
  const dialog = document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]');
  if (!dialog) return false;
  const btns = [...dialog.querySelectorAll("button:not([disabled])")];
  const text = (dialog.textContent ?? "").toLowerCase();
  // Only consider it a confirmation modal if it has a Yes/OK + Cancel pair,
  // not a regular form modal. Workday's Add-Experience modal has many fields,
  // so we exclude any dialog with > 2 form inputs.
  const inputs = dialog.querySelectorAll("input:not([type='hidden']), textarea, select").length;
  if (inputs > 2) return false;
  return (btns.length <= 4) &&
    /are you sure|confirm|discard|leave\s*this\s*page|unsaved\s*changes/.test(text);
}

// Wait for a SUSTAINED page change. Prevents reacting to interstitial modal
// flashes (page snapshot briefly changes when a transient overlay opens).
async function _waitForStablePageChange(prevSnapshot, timeoutMs = 12000) {
  const start = Date.now();
  let candidateSnap = null;
  let stableSince  = 0;
  const STABLE_MS  = 600;

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 250));
    const now = _pageSnapshot();
    if (now === prevSnapshot) {
      candidateSnap = null;
      stableSince = 0;
      continue;
    }
    if (candidateSnap === now) {
      if (Date.now() - stableSince >= STABLE_MS) return now;
    } else {
      candidateSnap = now;
      stableSince = Date.now();
    }
  }
  return null;
}

// Heuristic: are we on the final review/confirmation step where we must stop?
function _isReviewOrSubmitStep() {
  const heading = (document.querySelector("h1, h2, h3, [role='heading']")?.textContent ?? "").toLowerCase();
  if (/\breview\b|\bconfirm\b|\bverify\b|\bsummary\b|review your|review and submit/i.test(heading)) return true;

  // If a visible Submit button exists but no Continue/Next, we're at the end
  const enabledBtns = [...document.querySelectorAll("button:not([disabled])")];
  const hasSubmit = enabledBtns.some((b) => _SUBMIT_BTN_RE.test((b.innerText ?? "").trim()));
  const hasNext   = enabledBtns.some((b) => _NEXT_BTN_RE.test((b.innerText ?? "").trim()));
  return hasSubmit && !hasNext;
}

// Cheap structural hash of the page — change in this string ≈ page advanced.
function _pageSnapshot() {
  const heading = (document.querySelector("h1, h2, h3, [role='heading']")?.textContent ?? "").slice(0, 60);
  const inputs = [...document.querySelectorAll("input:not([type='hidden']), textarea, select")]
    .slice(0, 5)
    .map((el) => (el.getAttribute("name") ?? el.id ?? el.getAttribute("data-automation-id") ?? ""))
    .join("|");
  return `${location.pathname}::${heading}::${inputs}`;
}

async function _waitForPageChange(prevSnapshot, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 400));
    const now = _pageSnapshot();
    if (now !== prevSnapshot) return now;
  }
  return null;
}

// Generic autopilot orchestrator. `requestFill` is the dedicated dispatcher
// for the site (requestFaangFill, requestAccentureFill, etc.).
//
// `siteLabel` is shown in status messages ("FAANG", "Accenture", "Generic").
async function runGenericMultiStepAutopilot({
  jobId, job, statusEl, requestFill,
  siteLabel = "this application",
  maxSteps  = 12,
  preFetchFiles = true,
  requireResume = false,   // if true, halt early when resume missing
}) {
  let totalFilled = 0, totalSkipped = 0;
  const allErrors = [];
  const visited = new Set();

  // Abort sentinel: if the status element gets detached (user closed the
  // panel), we exit cleanly on the next loop iteration.
  const isAborted = () => statusEl && !statusEl.isConnected;

  // ── Pre-flight: connection check ────────────────────────────────────────
  const sessionRes = await swMsg({ type: "GET_SESSION" });
  if (!sessionRes?.ok || !sessionRes?.loggedIn) {
    if (statusEl) {
      statusEl.style.color = "#991b1b";
      statusEl.innerHTML = `⚠ Not connected to NextRole. <a href="#" id="nr-ap-connect" style="color:inherit;text-decoration:underline;">Sign in</a> first.`;
      statusEl.querySelector("#nr-ap-connect")?.addEventListener("click", (ev) => {
        ev.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/login` });
      });
    }
    return { totalFilled: 0, totalSkipped: 0, allErrors: ["Not signed in"] };
  }

  // 1. Pre-fetch tailor data ONCE for the whole application
  const tailorState = await loadTailorState();
  let resumeData = null, coverLetterData = null, tailorData = null;

  if (tailorState.tailor_enabled) {
    if (statusEl) statusEl.textContent = "✨ Tailoring once for the whole application…";
    const tailorResult = await runTailorIfEnabled({ jobId, job });

    // Detect typed error from runTailorIfEnabled
    if (tailorResult?.__tailorError) {
      if (statusEl) {
        let label = tailorResult.message ?? "Tailor failed";
        if (tailorResult.cap_reached)         label = "Daily tailor limit reached (Starter: 1/day). Continuing without AI tailoring.";
        else if (tailorResult.insufficient_credits) label = "Not enough credits for tailoring. Continuing without AI tailoring.";
        else if (tailorResult.upgrade)        label = "AI tailoring is a Starter+ feature. Continuing without it.";
        statusEl.innerHTML = `⚠ ${esc(label)}`;
        await new Promise((r) => setTimeout(r, 1800));   // let user read it
      }
      tailorData = null;
      allErrors.push(`Tailor: ${tailorResult.message}`);
    } else {
      tailorData = tailorResult;
    }
  }

  if (isAborted()) return { totalFilled, totalSkipped, allErrors: ["Aborted by user"] };

  // 2. Pre-fetch resume + cover letter once
  if (preFetchFiles) {
    [resumeData, coverLetterData] = await Promise.all([
      fetchResumeBlob(jobId),
      fetchCoverLetterBlob(),
    ]);
    if (requireResume && !resumeData) {
      if (statusEl) {
        statusEl.style.color = "#991b1b";
        statusEl.innerHTML = `⚠ No resume uploaded. <a href="#" id="nr-ap-up" style="color:inherit;text-decoration:underline;">Upload one</a> first.`;
        statusEl.querySelector("#nr-ap-up")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/profile#section-resume` });
        });
      }
      return { totalFilled: 0, totalSkipped: 0, allErrors: ["No resume available"] };
    }
  }

  // 3. Loop
  for (let step = 1; step <= maxSteps; step++) {
    // Abort if user closed the panel mid-run
    if (isAborted()) {
      allErrors.push("Aborted (panel closed)");
      break;
    }

    // Captcha detection — halt; user must solve before continuing
    if (_detectCaptcha()) {
      if (statusEl) {
        statusEl.style.color = "#92400e";
        statusEl.innerHTML = `🤖 CAPTCHA detected — solve it manually, then run autopilot again`;
      }
      allErrors.push(`Step ${step}: captcha required`);
      break;
    }

    // Halt if we're at Review/Submit
    if (_isReviewOrSubmitStep()) {
      if (statusEl) {
        statusEl.style.color = "#166534";
        statusEl.innerHTML = `🎉 Reached <strong>Review</strong> — verify everything and click <strong>Submit</strong> yourself`;
      }
      break;
    }

    const snap = _pageSnapshot();
    if (visited.has(snap)) {
      allErrors.push(`Step ${step}: loop detected on same page — stopping`);
      if (statusEl) statusEl.innerHTML = `⚠ Loop detected — finish manually from here`;
      break;
    }
    visited.add(snap);

    // No-op detection: if there's no form fields at all on this page, the
    // "fill" step would do nothing and we'd just press Continue forever.
    const fillableFieldCount = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled]), ' +
      'textarea:not([disabled]), select:not([disabled])'
    ).length;
    if (fillableFieldCount === 0) {
      if (statusEl) statusEl.innerHTML = `⚠ Step ${step}: no fillable fields detected — finish manually`;
      allErrors.push(`Step ${step}: empty page`);
      break;
    }

    const headingText = (document.querySelector("h1, h2, h3")?.textContent ?? "").trim().slice(0, 40);
    if (statusEl) statusEl.innerHTML = `📋 Step ${step}: filling${headingText ? ` <strong>${esc(headingText)}</strong>` : ""}…`;

    const r = await requestFill(resumeData, coverLetterData, tailorData);
    totalFilled  += r.filled;
    totalSkipped += r.skipped;
    if (r.errors?.length) allErrors.push(...r.errors.map((e) => `Step ${step}: ${e}`));

    // Let React update + Workday's own validation kick in
    await new Promise((res) => setTimeout(res, 700));

    if (isAborted()) { allErrors.push("Aborted (panel closed)"); break; }

    // Validation check
    const invalid = document.querySelectorAll('[aria-invalid="true"]:not([type="hidden"]), [aria-errormessage]:not([aria-errormessage=""])');
    if (invalid.length > 0) {
      const labels = [...invalid].slice(0, 3).map((el) =>
        (el.getAttribute("aria-label") ?? el.placeholder ?? el.name ?? "field").slice(0, 40)
      );
      if (statusEl) {
        statusEl.style.color = "#991b1b";
        statusEl.innerHTML = `⚠ Step ${step}: ${invalid.length} field${invalid.length !== 1 ? "s" : ""} flagged invalid — review<br><span style="font-size:11px;">${labels.map(esc).join(", ")}</span>`;
      }
      allErrors.push(`Step ${step}: ${invalid.length} validation errors`);
      break;
    }

    // Find + click Next button (ranked — prefers primary over Skip/Back)
    const nextBtn = _findGenericNextButton();
    if (!nextBtn) {
      if (statusEl) statusEl.innerHTML = `⚠ No Continue/Next button found on step ${step} — finish manually`;
      allErrors.push(`Step ${step}: no continue button`);
      break;
    }

    const btnText = (nextBtn.innerText ?? nextBtn.value ?? "Next").trim();
    if (statusEl) statusEl.innerHTML = `↪ Clicking <strong>${esc(btnText)}</strong>…`;
    nextBtn.click();

    // Wait for page transition (with stability — wait until snapshot is stable
    // for 600ms so we don't react to interstitial modal flashes).
    const newSnap = await _waitForStablePageChange(snap, 12000);
    if (!newSnap) {
      if (statusEl) statusEl.innerHTML = `⚠ Page didn't advance after step ${step} — finish manually`;
      allErrors.push(`Step ${step}: didn't navigate after click`);
      break;
    }

    // After advance: if a confirmation modal opened (e.g. "Are you sure?"),
    // detect and skip — most ATSs don't pop these but some surveys do.
    if (_detectModalConfirmation()) {
      if (statusEl) statusEl.innerHTML = `ℹ Step ${step}: confirmation modal — please respond manually`;
      allErrors.push(`Step ${step}: confirmation dialog`);
      break;
    }
  }

  return { totalFilled, totalSkipped, allErrors };
}

// ─── Workday Application section helper ──────────────────────────────────────

async function renderWorkdayHelper(container, jobId, job, section) {
  container.innerHTML = `<div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading profile…</div>`;

  const [res, evalCtx] = await Promise.all([
    swMsg({ type: "GET_PROFILE" }),
    loadEvalContext(),
  ]);

  // Surface failures instead of hanging on the spinner.
  if (!res || res.ok === false || !res.profile) {
    const errMsg = res?.error ?? "Could not load profile";
    const isAuth = /unauthor|not\s*connected|401/i.test(errMsg);
    container.innerHTML = `
      <div style="padding:16px;font-size:13px;color:#374151;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:6px;">⚠ ${esc(errMsg)}</div>
        ${isAuth
          ? `<div>Please <a href="#" id="nr-wd-signin" style="color:#ea580c;text-decoration:underline;">sign in to NextRole</a> and try again.</div>`
          : `<div style="color:#6b7280;">Check that the NextRole webapp is running and reachable, then reload this page.</div>`}
      </div>`;
    container.querySelector("#nr-wd-signin")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/login` });
    });
    return;
  }

  const p = res.profile;

  function qaRow(label, value, hint) {
    const safeLabel = label.slice(0, 16);
    return `
      <div class="nr-ac-field-row" style="align-items:center;min-height:34px;">
        <div class="nr-ac-field-lbl" title="${esc(label)}">${esc(safeLabel)}</div>
        <div class="nr-ac-field-val" style="display:flex;align-items:center;gap:6px;min-width:0;">
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;${value ? "" : "color:#9a9286;font-style:italic;"}">
            ${esc(value ?? hint)}
          </span>
          ${value ? `<button class="nr-ac-copy-btn" data-val="${esc(value)}" title="Copy">⎘</button>` : ""}
        </div>
      </div>`;
  }

  function note(cls, msg) { return `<div class="${cls}">${msg}</div>`; }

  const needsResume = section === "My Experience";
  const canFill     = section !== "Review" && section !== "Application Questions";

  const fillLabel = needsResume ? "⬆ Auto-Upload Resume + Fill" : "⚡ Fill This Step";
  const fillBtnHtml = canFill
    ? `<button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-wd-fill" style="margin-top:6px;">${fillLabel}</button>`
    : "";

  let sectionContent = "";

  if (section === "My Information") {
    const firstName = p.first_name ?? (p.full_name ?? "").split(" ")[0] ?? null;
    const lastName  = p.last_name  ?? (p.full_name ?? "").split(" ").slice(1).join(" ") ?? null;
    sectionContent = `
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("First Name",  firstName,    "from profile")}
          ${qaRow("Last Name",   lastName,     "from profile")}
          ${qaRow("Email",       p.email,      "from profile")}
          ${qaRow("Phone",       p.phone,      "from profile")}
          ${qaRow("Phone Type",  "Mobile",     "auto-selected")}
          ${qaRow("Country",     "India",      "auto-selected")}
          ${qaRow("City",        p.location,   "from profile")}
          ${qaRow("LinkedIn",    p.linkedin,   "from profile")}
          ${qaRow("How Heard",   "Job Board",  "auto-selected")}
        </div>
      </div>
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Manual (no profile data)</div>
        <div class="nr-ac-field-list">
          ${qaRow("Address",   null, "Street, apartment, locality")}
          ${qaRow("State",     null, "Select your state")}
          ${qaRow("Postal",    null, "6-digit PIN code")}
        </div>
      </div>
      ${fillBtnHtml}
    `;
  } else if (section === "My Experience") {
    sectionContent = `
      ${note("nr-ac-manual-note", "📄 Resume, work history &amp; education will be filled from your CV")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("Resume",         "nextrole_resume.doc", "auto-uploaded")}
          ${qaRow("LinkedIn",       p.linkedin,            "from profile")}
          ${qaRow("GitHub",         p.github,              "from profile")}
          ${qaRow("Portfolio",      p.website,             "from profile")}
          ${qaRow("Work History",   "from CV",             "each entry added via Add modal")}
          ${qaRow("Education",      "from CV",             "each entry added via Add modal")}
          ${qaRow("Certifications", "from CV",             "if present in CV")}
        </div>
      </div>
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Manual</div>
        <div class="nr-ac-field-list">
          ${qaRow("Skills", null, "Search and add from profile")}
        </div>
      </div>
      ${fillBtnHtml}
      <button class="nr-ac-btn nr-ac-secondary nr-ac-full" id="nr-ac-wd-resume-open" style="margin-top:4px;">↗ Download Resume from NextRole</button>
    `;
  } else if (section === "Application Questions") {
    sectionContent = `
      ${note("nr-ac-manual-note", "📋 Application questions are company-specific and vary per role")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Guidance</div>
        <div class="nr-ac-field-list">
          ${qaRow("Work auth", "Yes / Citizen", "Are you authorized to work?")}
          ${qaRow("Sponsorship", "No", "Do you need sponsorship?")}
          ${qaRow("Relocate", "Yes / Flexible", "Willing to relocate?")}
        </div>
      </div>
      ${note("nr-ac-hint", "💡 Use copy buttons above for quick answers. Most other questions need manual answers.")}
    `;
  } else if (section === "Self Identify") {
    sectionContent = `
      ${note("nr-ac-readonly-note", "✓ All EEO fields auto-set to Prefer Not to Answer (or from profile)")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("Gender",    p.gender ?? "Prefer not to say", "auto-selected")}
          ${qaRow("Ethnicity", "Prefer not to disclose",        "auto-selected")}
          ${qaRow("Veteran",   "Not a protected veteran",       "auto-selected")}
          ${qaRow("Disability","No, I don't have a disability", "auto-selected")}
        </div>
      </div>
      ${fillBtnHtml}
    `;
  } else if (section === "Review") {
    sectionContent = `
      ${note("nr-ac-readonly-note", "✅ Review all your details before submitting")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Checklist</div>
        <div class="nr-ac-field-list">
          ${qaRow("Name & contact", "Verify", "Check all details are correct")}
          ${qaRow("Resume",         "Verify", "Correct resume uploaded")}
          ${qaRow("Questions",      "Verify", "All questions answered")}
          ${qaRow("EEO fields",     "Verify", "Self-identify filled")}
        </div>
      </div>
      ${note("nr-ac-manual-note", "⚠ Submit button is NOT auto-clicked — review first, then submit yourself.")}
    `;
  } else {
    sectionContent = `
      <div class="nr-ac-empty">
        Workday form detected — section unknown.<br>
        <span style="font-size:11.5px;">Navigate to the application section, then click <strong>Re-scan</strong>.</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="nr-ac-workday-banner">
      <div class="nr-ac-workday-banner-icon">🔷</div>
      <div>
        <div class="nr-ac-workday-banner-title">
          Workday${section && section !== "unknown" ? ` — ${esc(section)}` : ""}
        </div>
        <div class="nr-ac-workday-banner-sub">
          Click Fill This Step to auto-fill fields. Re-scan after moving to the next section.
        </div>
      </div>
    </div>
    ${sectionContent}
    ${buildEvalPickerHtml({
      tier:           evalCtx.tier,
      autoMatch:      evalCtx.autoMatch,
      recent:         evalCtx.recent,
      state:          evalCtx.state,
      tailorUsesToday: evalCtx.tailorUsesToday,
    })}
    <div id="nr-ac-wd-fill-result" style="display:none;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;"></div>
    <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-wd-autopilot" style="margin-top:8px;background:linear-gradient(90deg,#0057b8 0%,#3b82f6 100%);">
      🚀 Auto-fill ALL sections (stops at Review)
    </button>
    <div id="nr-ac-wd-autopilot-status" style="display:none;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#f0f4ff;border:1px solid #c7d2fe;color:#3730a3;line-height:1.5;max-height:240px;overflow-y:auto;"></div>
    <button class="nr-ac-btn nr-ac-secondary nr-ac-full" id="nr-ac-wd-rescan" style="margin-top:6px;">↻ Re-scan (moved to next section)</button>
  `;
  wireEvalPicker(container, evalCtx.state);

  // Resume manual download
  container.querySelector("#nr-ac-wd-resume-open")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "OPEN_TAB",
      url: jobId
        ? `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}`
        : `${NEXTROLE_URL}/dashboard/pipeline`,
    });
  });

  // Fill button
  const fillBtn   = container.querySelector("#nr-ac-wd-fill");
  const resultEl  = container.querySelector("#nr-ac-wd-fill-result");

  if (fillBtn && resultEl) {
    fillBtn.addEventListener("click", async () => {
      fillBtn.disabled = true;
      fillBtn.textContent = needsResume ? "⏳ Fetching resume…" : "⏳ Filling…";
      resultEl.style.display = "none";

      let resumeData = null;
      let coverLetterData = null;
      let tailorData = null;

      const tailorState = await loadTailorState();
      if (tailorState.tailor_enabled) {
        fillBtn.textContent = "✨ Tailoring with AI…";
        tailorData = await runTailorIfEnabled({ jobId, job });
      }

      if (needsResume) {
        fillBtn.textContent = "⏳ Fetching resume…";
        [resumeData, coverLetterData] = await Promise.all([
          fetchResumeBlob(jobId),
          fetchCoverLetterBlob(),
        ]);
        if (!resumeData) {
          resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;";
          resultEl.innerHTML = `⚠ No resume available. <a href="#" id="nr-ac-wd-upload-link" style="color:#c84a1f;text-decoration:underline;">Upload one in your profile</a> or generate a tailored resume in NextRole.`;
          container.querySelector("#nr-ac-wd-upload-link")?.addEventListener("click", (ev) => {
            ev.preventDefault();
            chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/profile#section-resume` });
          });
          fillBtn.disabled = false;
          fillBtn.textContent = fillLabel;
          return;
        }
        fillBtn.textContent = "⏳ Uploading & filling…";
      } else {
        fillBtn.textContent = "⏳ Filling…";
      }

      const res = await requestWorkdayFill(section, resumeData, coverLetterData, tailorData);

      const hasErrors = res.errors && res.errors.length > 0;
      if (res.filled > 0) {
        resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;";
        resultEl.innerHTML = `✓ Filled ${res.filled} field${res.filled !== 1 ? "s" : ""}` +
          (res.skipped > 0 ? ` &nbsp;·&nbsp; ${res.skipped} skipped` : "") +
          (hasErrors ? `<br><span style="color:#92400e;font-size:11px;">${res.errors.join("; ")}</span>` : "");
      } else {
        resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;";
        resultEl.innerHTML = `⚠ Nothing filled — ${res.errors?.join("; ") || "fields not found on page"}`;
      }

      fillBtn.disabled = false;
      fillBtn.textContent = fillLabel;
    });
  }

  // Copy buttons
  container.querySelectorAll(".nr-ac-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(btn.dataset.val ?? "").catch(() => {});
      const orig = btn.textContent;
      btn.textContent = "✓";
      setTimeout(() => { btn.textContent = orig; }, 1200);
    });
  });

  // Re-scan
  container.querySelector("#nr-ac-wd-rescan")?.addEventListener("click", () => {
    const tabBody = container.closest(".nr-ac-tab-body") ?? container;
    renderFillTab(tabBody, jobId, job);
  });

  // ── Autopilot: fill every section, click Save and Continue between, stop at Review
  const autopilotBtn = container.querySelector("#nr-ac-wd-autopilot");
  const autopilotStatus = container.querySelector("#nr-ac-wd-autopilot-status");
  if (autopilotBtn && autopilotStatus) {
    autopilotBtn.addEventListener("click", async () => {
      autopilotBtn.disabled = true;
      autopilotBtn.textContent = "🚀 Running…";
      autopilotStatus.style.display = "block";
      autopilotStatus.textContent = "Starting…";

      const stepLog = [];
      const result = await runWorkdayAutopilot({
        jobId, job,
        statusEl: autopilotStatus,
        onStepResult: (step, sec, r) => {
          stepLog.push(`${step}. ${sec} → ${r.filled} filled, ${r.skipped} skipped`);
        },
      });

      // Final summary
      const ok = result.allErrors.length === 0;
      const summaryHtml = `
        <div style="font-size:11px;line-height:1.6;margin-top:6px;">
          <strong>Run summary</strong><br>
          ${stepLog.map((l) => `&nbsp;&nbsp;• ${esc(l)}`).join("<br>")}
          ${result.allErrors.length > 0
            ? `<br><strong style="color:#991b1b;">Issues:</strong><br>${result.allErrors.slice(0, 5).map((e) => `&nbsp;&nbsp;• ${esc(e)}`).join("<br>")}`
            : ""}
        </div>`;

      const existing = autopilotStatus.innerHTML;
      autopilotStatus.innerHTML = existing + summaryHtml;

      autopilotBtn.disabled = false;
      autopilotBtn.textContent = ok
        ? "🚀 Auto-fill ALL sections (stops at Review)"
        : "🔁 Run again";
    });
  }
}

// ─── Accenture fill dispatcher ────────────────────────────────────────────────

// Tries the tailored resume for this job first; if absent, falls back to the
// user's uploaded default resume from the Profile page.
async function fetchResumeBlob(jobId) {
  // 1. Job-specific tailored resume (AI-generated HTML → .doc)
  if (jobId) {
    try {
      const res = await swMsg({ type: "GET_RESUME_FILE", jobId });
      if (res?.ok && res.data) {
        return {
          data:     res.data,
          type:     res.type ?? "application/msword",
          filename: res.filename ?? "nextrole_resume.doc",
        };
      }
    } catch { /* fall through */ }
  }
  // 2. User's uploaded default resume (PDF/DOCX from Profile page)
  try {
    const res = await swMsg({ type: "GET_PROFILE_FILE", kind: "resume" });
    if (res?.ok && res.data) {
      return {
        data:     res.data,
        type:     res.type ?? "application/pdf",
        filename: res.filename ?? "resume.pdf",
      };
    }
  } catch { /* no resume available */ }
  return null;
}

// Fetches the user's uploaded default cover letter file (from Profile page).
async function fetchCoverLetterBlob() {
  try {
    const res = await swMsg({ type: "GET_PROFILE_FILE", kind: "cover_letter" });
    if (res?.ok && res.data) {
      return {
        data:     res.data,
        type:     res.type ?? "application/pdf",
        filename: res.filename ?? "cover_letter.pdf",
      };
    }
  } catch { /* none uploaded */ }
  return null;
}

function requestAccentureFill(stepNum, resumeData = null) {
  return new Promise((resolve) => {
    const TIMEOUT_MS = 18000;
    let done = false;

    const handler = (e) => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:accenture-fill-done", handler);
      resolve(e.detail ?? { filled: 0, skipped: 0, errors: [] });
    };
    document.addEventListener("nr:accenture-fill-done", handler);

    document.dispatchEvent(new CustomEvent("nr:accenture-fill", {
      detail: { stepNum, resumeData },
    }));

    setTimeout(() => {
      if (done) return;
      done = true;
      document.removeEventListener("nr:accenture-fill-done", handler);
      resolve({ filled: 0, skipped: 0, errors: ["auto-fill.js did not respond (timeout)"] });
    }, TIMEOUT_MS);
  });
}

// ─── Accenture Application passive helper ────────────────────────────────────

async function renderAccentureHelper(container, jobId, job, currentStep) {
  container.innerHTML = `<div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading profile…</div>`;

  const res = await swMsg({ type: "GET_PROFILE" });
  const p   = res?.profile ?? {};

  const STEP_MAP = {
    "Upload Resume":          1,
    "Additional Information": 2,
    "My Information":         3,
    "Address":                4,
    "Experience":             5,
    "Education":              6,
    "Picture Upload":         7,
    "Review":                 8,
  };
  const stepNum = STEP_MAP[currentStep] ?? 0;

  function qaRow(label, value, hint) {
    const safeLabel = label.slice(0, 14);
    return `
      <div class="nr-ac-field-row" style="align-items:center;min-height:34px;">
        <div class="nr-ac-field-lbl" title="${esc(label)}">${esc(safeLabel)}</div>
        <div class="nr-ac-field-val" style="display:flex;align-items:center;gap:6px;min-width:0;">
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;${value ? "" : "color:#9a9286;font-style:italic;"}">
            ${esc(value ?? hint)}
          </span>
          ${value ? `<button class="nr-ac-copy-btn" data-val="${esc(value)}" title="Copy">⎘</button>` : ""}
        </div>
      </div>`;
  }

  function note(cls, msg) {
    return `<div class="${cls}">${msg}</div>`;
  }

  // Fill button — shown on every fillable step
  const canAutoFill = stepNum >= 1 && stepNum <= 8 && stepNum !== 7;
  const fillBtnHtml = canAutoFill
    ? `<button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-acc-fill" style="margin-top:6px;">
         ⚡ Fill This Step
       </button>`
    : ``;

  let stepContent = "";

  if (stepNum === 1) {
    stepContent = `
      ${note("nr-ac-manual-note", "📄 Upload your resume (.doc/.docx/.pdf, max 4.5 MB)")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Actions</div>
        <div class="nr-ac-field-list">
          ${qaRow("File format", ".doc (auto)", "")}
          ${qaRow("Max size", "4.5 MB", "")}
        </div>
      </div>
      <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-acc-fill" style="margin-bottom:8px;">
        ⬆ Auto-Upload Resume
      </button>
      <button class="nr-ac-btn nr-ac-secondary nr-ac-full" id="nr-ac-acc-resume-open" style="margin-bottom:4px;">
        ↗ Download from NextRole (manual)
      </button>
      <div class="nr-ac-hint">Auto-Upload fetches your NextRole resume and injects it directly into the file field.</div>
    `;
  } else if (stepNum === 2) {
    stepContent = `
      ${note("nr-ac-readonly-note", "✓ Nationality & DOB are usually pre-filled from your Accenture account")}
      ${note("nr-ac-manual-note", "⚠ Have your PAN Card ready — pattern: AAAAA9999A")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("Nationality", "India", "Select India")}
          ${qaRow("Citizenship", "Citizen (India)", "Select Citizen (India)")}
        </div>
      </div>
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Manual (no profile data)</div>
        <div class="nr-ac-field-list">
          ${qaRow("PAN Card", null, "Enter from your physical PAN card")}
          ${qaRow("Date of Birth", null, "Pre-filled from account (DD/MM/YYYY)")}
        </div>
      </div>
      ${fillBtnHtml}
    `;
  } else if (stepNum === 3) {
    stepContent = `
      ${note("nr-ac-readonly-note", "✓ Name, Email, Phone are pre-filled from your Accenture account")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("Heard about us", "Job Portal / Naukri", "Select from dropdown")}
          ${qaRow("Prev. Accenture", "No", "Select No (unless previously employed)")}
          ${qaRow("Gender", p.gender ?? null, "Select your gender")}
          ${qaRow("Disability", "No", "Select No (unless applicable)")}
        </div>
      </div>
      ${fillBtnHtml}
    `;
  } else if (stepNum === 4) {
    const city = p.location ?? null;
    stepContent = `
      ${note("nr-ac-manual-note", "📍 Enter your current residential address")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("Country", "India", "India")}
          ${qaRow("City", city, "Select your city")}
        </div>
      </div>
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Manual (fill from your address)</div>
        <div class="nr-ac-field-list">
          ${qaRow("Address Line 1", null, "House no., street, locality")}
          ${qaRow("Address Line 2", null, "Optional")}
          ${qaRow("Postal Code", null, "6-digit PIN code")}
          ${qaRow("State", null, "Select your state")}
        </div>
      </div>
      ${fillBtnHtml}
    `;
  } else if (stepNum === 5) {
    const skills  = (p.target_roles ?? []).slice(0, 5);
    const hasExp  = (p.years_experience ?? 0) > 0;
    const workExp = hasExp ? "Yes" : "No";
    const skillStr = skills.length > 0 ? skills.join(", ") : null;
    stepContent = `
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("Work Experience", workExp, "Yes or No")}
          ${qaRow("Skills (up to 5)", skillStr, "Type to search and select")}
        </div>
      </div>
      ${note("nr-ac-hint", "💡 Skills are added one by one via typeahead — may take a few seconds.")}
      ${fillBtnHtml}
    `;
  } else if (stepNum === 6) {
    stepContent = `
      ${note("nr-ac-manual-note", "📚 Enter your highest education details as per your degree certificate")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Will be auto-filled</div>
        <div class="nr-ac-field-list">
          ${qaRow("Degree", "Bachelor's Degree", "e.g. Bachelor's Degree")}
        </div>
      </div>
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Manual (must match certificate)</div>
        <div class="nr-ac-field-list">
          ${qaRow("University", null, "Search your university name")}
          ${qaRow("Field of Study", null, "e.g. Computer Science")}
          ${qaRow("From", null, "Start year (from certificate)")}
          ${qaRow("To", null, "End/completion year")}
        </div>
      </div>
      ${fillBtnHtml}
    `;
  } else if (stepNum === 7) {
    stepContent = `
      ${note("nr-ac-manual-note", "📷 Take a clear selfie using your webcam")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Photo tips (manual only)</div>
        <div class="nr-ac-field-list">
          ${qaRow("Lighting", "Well-lit room", "")}
          ${qaRow("Position", "Face in the marker", "")}
          ${qaRow("Look", "Towards camera", "")}
          ${qaRow("Background", "Plain preferred", "")}
        </div>
      </div>
      <div class="nr-ac-hint" style="margin-top:4px;">Photo capture cannot be automated — use the webcam on the form directly.</div>
    `;
  } else if (stepNum === 8) {
    stepContent = `
      ${note("nr-ac-readonly-note", "✅ Review all your details before submitting")}
      <div class="nr-ac-step-section">
        <div class="nr-ac-step-section-title">Checkboxes (auto-checked)</div>
        <div class="nr-ac-field-list">
          ${qaRow("Terms checkbox", "✓ Acknowledge information is true", "")}
          ${qaRow("Privacy checkbox", "✓ Agree to data processing", "")}
          ${qaRow("Consent checkbox", "✓ Consent to AI screening", "")}
        </div>
      </div>
      ${fillBtnHtml}
      ${note("nr-ac-manual-note", "⚠ Submit button is NOT auto-clicked — review first, then click Submit yourself.")}
    `;
  } else {
    stepContent = `
      <div class="nr-ac-empty">
        Accenture multi-step form detected.<br>
        <span style="font-size:11.5px;">Click <strong>Re-scan</strong> after each step to get guidance for that step.</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="nr-ac-accenture-banner">
      <div class="nr-ac-accenture-banner-icon">🏢</div>
      <div>
        <div class="nr-ac-accenture-banner-title">
          Accenture${currentStep && currentStep !== "unknown" ? ` — ${esc(currentStep)}` : " Application"}
        </div>
        <div class="nr-ac-accenture-banner-sub">
          Multi-step form helper. Click Re-scan after advancing to each step.
        </div>
      </div>
    </div>
    ${stepContent}
    <div id="nr-ac-fill-result" style="display:none;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;"></div>
    <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-acc-autopilot" style="margin-top:8px;background:linear-gradient(90deg,#a100ff 0%,#c84a1f 100%);">
      🚀 Auto-fill ALL 8 steps (stops at Review)
    </button>
    <div id="nr-ac-acc-autopilot-status" style="display:none;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#fdf4ff;border:1px solid #f5d0fe;color:#86198f;line-height:1.5;max-height:240px;overflow-y:auto;"></div>
    <button class="nr-ac-btn nr-ac-secondary nr-ac-full" id="nr-ac-rescan" style="margin-top:6px;">↻ Re-scan (moved to next step)</button>
  `;

  // ── Wire up: Download fallback (step 1 manual download button)
  container.querySelector("#nr-ac-acc-resume-open")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "OPEN_TAB",
      url: jobId
        ? `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}`
        : `${NEXTROLE_URL}/dashboard/pipeline`,
    });
  });

  // ── Wire up: Fill This Step / Auto-Upload Resume button
  const fillBtn = container.querySelector("#nr-ac-acc-fill");
  const resultEl = container.querySelector("#nr-ac-fill-result");

  if (fillBtn && resultEl) {
    fillBtn.addEventListener("click", async () => {
      fillBtn.disabled = true;
      fillBtn.textContent = stepNum === 1 ? "⏳ Fetching resume…" : "⏳ Filling…";
      resultEl.style.display = "none";

      let resumeData = null;
      if (stepNum === 1) {
        // Fetch resume blob first
        resumeData = await fetchResumeBlob(jobId);
        if (!resumeData) {
          resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;";
          resultEl.innerHTML = "⚠ No resume found for this job. <a href='#' id='nr-ac-gen-resume-link' style='color:#c84a1f;text-decoration:underline;'>Generate one in NextRole first.</a>";
          container.querySelector("#nr-ac-gen-resume-link")?.addEventListener("click", (ev) => {
            ev.preventDefault();
            chrome.runtime.sendMessage({ type: "OPEN_TAB", url: jobId ? `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}` : `${NEXTROLE_URL}/dashboard/pipeline` });
          });
          fillBtn.disabled = false;
          fillBtn.textContent = "⬆ Auto-Upload Resume";
          return;
        }
        fillBtn.textContent = "⏳ Uploading…";
      }

      const res = await requestAccentureFill(stepNum, resumeData);

      // Show result
      const hasErrors = res.errors && res.errors.length > 0;
      if (res.filled > 0) {
        resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;";
        resultEl.innerHTML = `✓ Filled ${res.filled} field${res.filled !== 1 ? "s" : ""}` +
          (res.skipped > 0 ? ` &nbsp;·&nbsp; ${res.skipped} skipped` : "") +
          (hasErrors ? `<br><span style="color:#92400e;font-size:11px;">${res.errors.join("; ")}</span>` : "");
      } else {
        resultEl.style.cssText = "display:block;margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;";
        resultEl.innerHTML = `⚠ Nothing filled — ${res.errors?.join("; ") || "fields not found on page"}`;
      }

      fillBtn.disabled = false;
      fillBtn.textContent = stepNum === 1 ? "⬆ Auto-Upload Resume" : "⚡ Fill This Step";
    });
  }

  // ── Wire up: Copy buttons
  container.querySelectorAll(".nr-ac-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(btn.dataset.val ?? "").catch(() => {});
      const orig = btn.textContent;
      btn.textContent = "✓";
      setTimeout(() => { btn.textContent = orig; }, 1200);
    });
  });

  // ── Wire up: Re-scan button
  container.querySelector("#nr-ac-rescan")?.addEventListener("click", () => {
    // Re-trigger the fill tab which will re-scan
    const tabBody = container.closest(".nr-ac-tab-body") ?? container;
    renderFillTab(tabBody, jobId, job);
  });

  // ── Wire up: Autopilot — loop steps 1-8, click "Next" between each, stop at Review
  const accAutopilotBtn = container.querySelector("#nr-ac-acc-autopilot");
  const accAutopilotStatus = container.querySelector("#nr-ac-acc-autopilot-status");
  if (accAutopilotBtn && accAutopilotStatus) {
    accAutopilotBtn.addEventListener("click", async () => {
      accAutopilotBtn.disabled = true;
      accAutopilotBtn.textContent = "🚀 Running…";
      accAutopilotStatus.style.display = "block";
      accAutopilotStatus.textContent = "Starting…";

      // Build the per-step requestFill that picks up the active step from the DOM
      const requestFill = async (resumeData /*, coverLetterData, tailorData */) => {
        const activeStep = _accentureActiveStep();
        if (!activeStep) return { filled: 0, skipped: 0, errors: ["Couldn't detect active Accenture step"] };
        return requestAccentureFill(activeStep, resumeData);
      };

      const result = await runGenericMultiStepAutopilot({
        jobId, job,
        statusEl: accAutopilotStatus,
        siteLabel: "Accenture",
        requestFill,
        maxSteps: 10,
        preFetchFiles: true,
      });

      const ok = result.allErrors.length === 0;
      accAutopilotStatus.innerHTML += `
        <div style="font-size:11px;line-height:1.6;margin-top:6px;border-top:1px solid #f5d0fe;padding-top:6px;">
          <strong>Total: ${result.totalFilled} filled · ${result.totalSkipped} skipped</strong>
          ${result.allErrors.length > 0
            ? `<br><strong style="color:#991b1b;">Issues:</strong><br>${result.allErrors.slice(0, 5).map((e) => `&nbsp;&nbsp;• ${esc(e)}`).join("<br>")}`
            : ""}
        </div>`;

      accAutopilotBtn.disabled = false;
      accAutopilotBtn.textContent = ok
        ? "🚀 Auto-fill ALL 8 steps (stops at Review)"
        : "🔁 Run autopilot again";
    });
  }
}

// Detect which Accenture step is active by reading the mat-stepper header
function _accentureActiveStep() {
  const activeLabel = document.querySelector("mat-step-header.activeStep .mat-step-text-label")?.textContent?.trim() ?? "";
  // Map label → step number (Accenture uses sequential step indices)
  const stepIdx = [...document.querySelectorAll("mat-step-header")].findIndex(
    (h) => h.classList.contains("activeStep")
  );
  if (stepIdx >= 0) return stepIdx + 1;
  // Fallback: match by label keyword
  if (/upload.*resume|resume/i.test(activeLabel))        return 1;
  if (/additional.*info|nationality|pan/i.test(activeLabel)) return 2;
  if (/my.*info|gender|disability/i.test(activeLabel))   return 3;
  if (/address|country|city/i.test(activeLabel))         return 4;
  if (/experience|skills/i.test(activeLabel))            return 5;
  if (/education|degree/i.test(activeLabel))             return 6;
  if (/picture|photo/i.test(activeLabel))                return 7;
  if (/review|checkbox/i.test(activeLabel))              return 8;
  return null;
}

// ─── Naukri Q&A passive helper ───────────────────────────────────────────────

async function renderNaukriQAHelper(container, jobId, job) {
  container.innerHTML = `<div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading profile…</div>`;

  const res = await swMsg({ type: "GET_PROFILE" });
  const p   = res?.profile ?? {};

  // Format expected CTC from profile comp_min (stored as plain number, e.g. 1200000)
  function fmtCtc(val) {
    if (!val) return null;
    const n = Number(val);
    if (isNaN(n)) return String(val);
    if (n >= 100000) {
      const lakh = (n / 100000).toFixed(1).replace(/\.0$/, "");
      return `₹${lakh}L / year`;
    }
    return `₹${n.toLocaleString("en-IN")}`;
  }

  // Build Q&A rows — label, value (from profile), fallback hint
  const qaItems = [
    {
      label: "Total Experience",
      value: p.years_experience != null ? `${p.years_experience} year${p.years_experience !== 1 ? "s" : ""}` : null,
      hint:  "e.g. 4 years",
    },
    {
      label: "Current Location",
      value: p.location ?? null,
      hint:  "City you're currently in",
    },
    {
      label: "Expected CTC",
      value: fmtCtc(p.salary),
      hint:  "e.g. ₹12L / year",
    },
    {
      label: "Notice Period",
      value: null,
      hint:  "e.g. 30 days / Immediate",
    },
    {
      label: "Current CTC",
      value: null,
      hint:  "Your current package",
    },
    {
      label: "Current Company",
      value: null,
      hint:  "Your current employer",
    },
    {
      label: "Primary Skills",
      value: (p.target_roles ?? []).length > 0 ? p.target_roles.slice(0, 3).join(", ") : null,
      hint:  "e.g. React, Node.js, AWS",
    },
  ];

  const rowsHtml = qaItems.map(({ label, value, hint }) => {
    const safeId = "nr-naukri-" + label.replace(/\s+/g, "-").toLowerCase();
    return `
      <div class="nr-ac-field-row" style="align-items:center;min-height:36px;">
        <div class="nr-ac-field-lbl" title="${esc(label)}">${esc(label.slice(0, 13))}</div>
        <div class="nr-ac-field-val" style="display:flex;align-items:center;gap:6px;min-width:0;">
          <span id="${safeId}" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;${value ? "" : "color:#9a9286;font-style:italic;"}">
            ${esc(value ?? hint)}
          </span>
          ${value
            ? `<button class="nr-ac-copy-btn" data-val="${esc(value)}" title="Copy to clipboard">⎘</button>`
            : ""}
        </div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="nr-ac-naukri-banner">
      <div class="nr-ac-naukri-banner-icon">💬</div>
      <div>
        <div class="nr-ac-naukri-banner-title">Naukri Q&amp;A Detected</div>
        <div class="nr-ac-naukri-banner-sub">
          Answer each chatbot question on the right using your profile values below.
          Click ⎘ to copy any value.
        </div>
      </div>
    </div>
    <div class="nr-ac-field-list">${rowsHtml}</div>
    <div class="nr-ac-hint" style="margin-top:2px;">
      Missing values? Update your profile in NextRole and re-scan.
    </div>
    <button class="nr-ac-btn nr-ac-secondary nr-ac-full" id="nr-ac-rescan" style="margin-top:4px;">↻ Re-scan</button>
  `;

  // Wire up copy buttons
  container.querySelectorAll(".nr-ac-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.val ?? "";
      navigator.clipboard.writeText(val).then(() => {
        const orig = btn.textContent;
        btn.textContent = "✓";
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }).catch(() => {});
    });
  });

  // Re-scan: go back to regular field detection
  container.querySelector("#nr-ac-rescan")?.addEventListener("click", () => {
    renderFillTab(container, jobId, job);
  });
}

// ─── Evaluation tab ───────────────────────────────────────────────────────────

async function renderEvalTab(container, jobId, job, state, onEvalUpdated) {
  const evaluation = state.evaluation;

  if (!evaluation) {
    // Auto-run mode: triggered by "Evaluate First" button — skip the prompt and run immediately
    if (state.autoRunEval) {
      state.autoRunEval = false; // only auto-run once
      container.innerHTML = `
        <div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Running AI evaluation…</div>
        <div class="nr-ac-status" style="text-align:center;">This usually takes 15–30 seconds…</div>
      `;
      const res = await swMsg({ type: "EVALUATE_JOB", jobId });
      if (!res?.ok) {
        container.innerHTML = `
          <div class="nr-ac-eval-empty">
            <div class="nr-ac-eval-empty-icon">✦</div>
            <div class="nr-ac-eval-empty-title">Evaluation failed</div>
            <div class="nr-ac-err" style="width:100%;margin-bottom:12px;">${esc(res?.error ?? "Could not run evaluation — please try again")}</div>
            <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-run-eval">↻ Retry Evaluation</button>
          </div>
        `;
        container.querySelector("#nr-ac-run-eval")?.addEventListener("click", () => {
          state.autoRunEval = true;
          renderEvalTab(container, jobId, job, state, onEvalUpdated);
        });
        return;
      }
      state.evaluation = { id: res.evaluation_id, score: res.score, decision: res.decision, blocks: res.blocks };
      if (onEvalUpdated) onEvalUpdated();
      renderEvalTab(container, jobId, job, state, onEvalUpdated);
      return;
    }

    // Lazy-load safety net: if we haven't tried fetching yet (e.g. background
    // fetch failed silently), make one attempt to load a prior evaluation from the API.
    if (!state._evalFetchAttempted) {
      state._evalFetchAttempted = true;
      container.innerHTML = `<div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Checking for existing evaluation…</div>`;
      const artifacts = await fetchArtifacts(jobId);
      if (artifacts?.evaluation) {
        state.evaluation = artifacts.evaluation;
        if (onEvalUpdated) onEvalUpdated();
        renderEvalTab(container, jobId, job, state, onEvalUpdated);
        return;
      }
      // Cache recent_jobs for the pipeline picker below
      state._recentJobs = artifacts?.recent_jobs ?? [];
    }

    // Build pipeline picker options (jobs in pipeline the user can load an eval for)
    const recentJobs = state._recentJobs ?? [];
    const pickerOpts = recentJobs
      .map((j) => `<option value="${esc(j.id)}">${esc(j.title)} — ${esc(j.company)}</option>`)
      .join("");

    container.innerHTML = `
      <div class="nr-ac-eval-empty">
        <div class="nr-ac-eval-empty-icon">✦</div>
        <div class="nr-ac-eval-empty-title">No evaluation yet</div>
        <div class="nr-ac-eval-empty-desc">
          Get an AI fit score, CV match analysis, compensation insights,
          and interview tips tailored to this role.
        </div>
        <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-run-eval">
          ✦ Evaluate My Fit
        </button>
        <div class="nr-ac-status" id="nr-ac-eval-st"></div>

        ${recentJobs.length > 0 ? `
        <div class="nr-ac-eval-divider"><span>or load from pipeline</span></div>
        <select class="nr-ac-select" id="nr-ac-eval-picker" style="margin-bottom:8px;">
          <option value="">— choose a saved job —</option>
          ${pickerOpts}
        </select>
        <button class="nr-ac-btn nr-ac-secondary nr-ac-full" id="nr-ac-eval-load">
          Load Evaluation
        </button>
        <div class="nr-ac-status" id="nr-ac-eval-load-st"></div>
        ` : ""}
      </div>
    `;

    // ── Evaluate this job ──
    container.querySelector("#nr-ac-run-eval")?.addEventListener("click", async () => {
      const btn = container.querySelector("#nr-ac-run-eval");
      const st  = container.querySelector("#nr-ac-eval-st");
      btn.disabled = true; btn.textContent = "Running evaluation…";
      if (st) st.textContent = "This usually takes 15–30 seconds…";

      const res = await swMsg({ type: "EVALUATE_JOB", jobId });
      if (!res?.ok) {
        btn.disabled = false; btn.textContent = "✦ Evaluate My Fit";
        if (st) st.textContent = res?.error ?? "Evaluation failed — try again";
        return;
      }
      state.evaluation = {
        id: res.evaluation_id, score: res.score,
        decision: res.decision, blocks: res.blocks,
      };
      if (onEvalUpdated) onEvalUpdated();
      renderEvalTab(container, jobId, job, state, onEvalUpdated);
    });

    // ── Load eval from pipeline ──
    container.querySelector("#nr-ac-eval-load")?.addEventListener("click", async () => {
      const picker  = container.querySelector("#nr-ac-eval-picker");
      const loadBtn = container.querySelector("#nr-ac-eval-load");
      const loadSt  = container.querySelector("#nr-ac-eval-load-st");
      const selId   = picker?.value;
      if (!selId) { if (loadSt) loadSt.textContent = "Please select a job first."; return; }

      loadBtn.disabled = true; loadBtn.textContent = "Loading…";
      const artifacts = await fetchArtifacts(selId);
      if (!artifacts?.evaluation) {
        loadBtn.disabled = false; loadBtn.textContent = "Load Evaluation";
        if (loadSt) loadSt.textContent = "No evaluation found for that job yet.";
        return;
      }
      // Switch the card context to the selected pipeline job
      state.evaluation = artifacts.evaluation;
      if (onEvalUpdated) onEvalUpdated();
      renderEvalTab(container, selId, artifacts.job ?? job, state, onEvalUpdated);
    });
    return;
  }

  const score = evaluation.score ?? 0;
  const dec   = evaluation.decision ?? "watch";
  const col   = score >= 3.5 ? "#2f7a3a" : score >= 2.5 ? "#8a6d1a" : "#b53a3a";

  // Support both flat DB columns and nested blocks object from the evaluate API
  const blocks   = evaluation.blocks ?? {};
  const blockDef = [
    { key: "role_fit",                 title: "Role Fit" },
    { key: "cv_match",                 title: "CV Match" },
    { key: "compensation_analysis",    title: "Compensation" },
    { key: "personalization_guidance", title: "Personalization Tips" },
    { key: "interview_signals",        title: "Interview Signals" },
    { key: "legitimacy_check",         title: "Legitimacy" },
  ];

  const blocksHtml = blockDef.map(({ key, title }) => {
    const raw = blocks[key] ?? evaluation[key];
    if (!raw) return "";
    const text = (typeof raw === "string" ? raw :
      (raw.summary ?? raw.rationale ?? JSON.stringify(raw))).slice(0, 280);
    if (!text) return "";
    return `
      <div class="nr-ac-block">
        <div class="nr-ac-block-title">${esc(title)}</div>
        <div class="nr-ac-block-body">${esc(text)}${text.length >= 280 ? "…" : ""}</div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="nr-ac-score-row">
      <span class="nr-ac-score" style="color:${col}">${score.toFixed(1)}</span>
      <span class="nr-ac-dec-badge ${dec}">${dec}</span>
      <span style="font-size:12px;color:#6b6358;">/ 5.0</span>
    </div>
    ${blocksHtml || `<div class="nr-ac-block"><div class="nr-ac-block-body">${esc(
      blocks?.decision?.rationale ?? "No detail available."
    )}</div></div>`}
    <div class="nr-ac-divider"></div>
    <button class="nr-ac-btn nr-ac-ghost" id="nr-ac-eval-open">View full report in NextRole →</button>
    <div class="nr-ac-row" style="margin-top:10px;">
      <button class="nr-ac-btn nr-ac-secondary" id="nr-ac-eval-fill">Fill Application →</button>
      <button class="nr-ac-btn nr-ac-primary"   id="nr-ac-eval-pipeline">✓ In Pipeline</button>
    </div>
  `;

  container.querySelector("#nr-ac-eval-open")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "OPEN_TAB",
      url: evaluation.id
        ? `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}&eval=${evaluation.id}`
        : `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}`,
    });
  });

  // "Fill Application" → switch to Fill Form tab
  container.querySelector("#nr-ac-eval-fill")?.addEventListener("click", () => {
    if (state._switchTab) state._switchTab("fill");
  });

  // "✓ In Pipeline" → open pipeline page
  container.querySelector("#nr-ac-eval-pipeline")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "OPEN_TAB",
      url: `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}`,
    });
  });
}

// ─── Resume tab ───────────────────────────────────────────────────────────────

async function renderResumeTab(container, jobId, job, state) {
  const resume = state.resume;

  if (!resume) {
    // Lazy-load safety net: one attempt to load a prior tailored resume from the API
    if (!state._resumeFetchAttempted) {
      state._resumeFetchAttempted = true;
      container.innerHTML = `<div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Checking for existing resume…</div>`;
      const artifacts = await fetchArtifacts(jobId);
      if (artifacts?.resume) {
        state.resume = artifacts.resume;
        renderResumeTab(container, jobId, job, state);
        return;
      }
      // Nothing found — fall through to "no resume" UI
    }

    container.innerHTML = `
      <div class="nr-ac-empty">No tailored resume yet for this job.</div>
      <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-gen-resume">✦ Generate Tailored Resume</button>
      <div class="nr-ac-status" id="nr-ac-resume-st"></div>
    `;
    container.querySelector("#nr-ac-gen-resume")?.addEventListener("click", async () => {
      const btn = container.querySelector("#nr-ac-gen-resume");
      const st  = container.querySelector("#nr-ac-resume-st");
      btn.disabled = true; btn.textContent = "Generating resume…";
      if (st) st.textContent = "This usually takes 20–40 seconds…";

      const res = await swMsg({ type: "TAILOR_RESUME", payload: { job_id: jobId } });
      if (!res?.ok) {
        btn.disabled = false; btn.textContent = "✦ Generate Tailored Resume";
        if (st) st.textContent = res?.error ?? "Generation failed — try again";
        return;
      }
      // Persist result into shared state so returning to this tab shows it again
      state.resume = { id: res.resume_id, html: res.html, coverage: res.coverage };
      renderResumeTab(container, jobId, job, state);
    });
    return;
  }

  // Scale the resume to fit the card width (~348px inner) without reflowing.
  // Inject a zoom style into the <body> so the iframe renders at natural layout.
  const RESUME_DESIGN_WIDTH = 820;
  const CARD_INNER_WIDTH    = 348;
  const zoom = (CARD_INNER_WIDTH / RESUME_DESIGN_WIDTH).toFixed(4); // ~0.4244

  const scaledHtml = (resume.html ?? "").replace(
    /<body([^>]*)>/i,
    `<body$1 style="zoom:${zoom};transform-origin:top left;margin:0 auto;">`,
  );

  container.innerHTML = `
    <div class="nr-ac-resume-meta">
      ${resume.coverage != null ? `<strong>${resume.coverage}%</strong> JD coverage &nbsp;·&nbsp; ` : ""}Tailored for ${esc(job?.title ?? "this role")}
    </div>
    <div class="nr-ac-resume-frame-wrap">
      <iframe class="nr-ac-resume-frame" id="nr-ac-resume-frame"
        sandbox="allow-same-origin allow-modals"></iframe>
    </div>
    <div class="nr-ac-row">
      <button class="nr-ac-btn nr-ac-secondary" id="nr-ac-resume-print">⎙ Print / Save PDF</button>
      <button class="nr-ac-btn nr-ac-ghost"      id="nr-ac-resume-open">Open in NextRole →</button>
    </div>
  `;

  // Set srcdoc via JS — avoids any attribute encoding issues with large HTML
  const frame = container.querySelector("#nr-ac-resume-frame");
  if (frame) frame.srcdoc = scaledHtml;

  container.querySelector("#nr-ac-resume-print")?.addEventListener("click", () => {
    const f = container.querySelector("#nr-ac-resume-frame");
    if (f?.contentWindow) {
      f.contentWindow.focus();
      f.contentWindow.print();
    }
  });

  container.querySelector("#nr-ac-resume-open")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "OPEN_TAB",
      url: resume.id
        ? `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}`
        : `${NEXTROLE_URL}/dashboard/pipeline`,
    });
  });
}

// ─── Cover Letter tab ─────────────────────────────────────────────────────────

function renderCoverTab(container, job, state) {
  container.innerHTML = `
    <div class="nr-ac-hint">Generate a cover letter and copy it into the form, or edit it first.</div>
    <textarea class="nr-ac-cl-ta" id="nr-ac-cl-ta"
      placeholder="Click ✦ Generate to create a cover letter tailored to this job…"></textarea>
    <div class="nr-ac-row">
      <button class="nr-ac-btn nr-ac-secondary" id="nr-ac-cl-gen">✦ Generate</button>
      <button class="nr-ac-btn nr-ac-primary" id="nr-ac-cl-copy">Copy</button>
    </div>
    <div class="nr-ac-status" id="nr-ac-cl-st"></div>
  `;

  const ta = container.querySelector("#nr-ac-cl-ta");
  const st = container.querySelector("#nr-ac-cl-st");

  // Restore text from shared state (survives tab switches)
  if (ta && state.coverLetter) ta.value = state.coverLetter;

  // Persist edits back into shared state on every keystroke
  ta?.addEventListener("input", () => { state.coverLetter = ta.value; });

  container.querySelector("#nr-ac-cl-gen")?.addEventListener("click", async () => {
    const btn = container.querySelector("#nr-ac-cl-gen");
    btn.disabled = true; btn.textContent = "Generating…";
    if (st) st.textContent = "";

    const res = await swMsg({
      type: "FILL_SUGGEST",
      payload: {
        field_type:      "cover_letter",
        field_label:     "Cover Letter",
        job_title:       job?.title       ?? "",
        company:         job?.company     ?? "",
        job_description: job?.description ?? "",
        current_value:   ta?.value        ?? "",
      },
    });

    btn.disabled = false;
    if (res?.ok && res.suggestion) {
      if (ta) { ta.value = res.suggestion; state.coverLetter = res.suggestion; }
      btn.textContent = "✦ Regenerate";
    } else {
      btn.textContent = "✦ Generate";
      if (st) st.textContent = res?.upgrade
        ? "Cover letter generation requires a Pro plan"
        : (res?.error ?? "Generation failed — try again");
    }
  });

  container.querySelector("#nr-ac-cl-copy")?.addEventListener("click", () => {
    const text = ta?.value ?? "";
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(() => {
      if (st) {
        st.textContent = "✓ Copied to clipboard";
        setTimeout(() => { if (st) st.textContent = ""; }, 2000);
      }
    }).catch(() => {
      if (st) st.textContent = "Copy failed — select and copy manually";
    });
  });
}

// ─── Event: triggered from content.js ────────────────────────────────────────

document.addEventListener("nr:open-apply-card", (e) => {
  const jobId    = e.detail?.jobId    ?? null;
  const jobTitle = e.detail?.jobTitle ?? null;
  const mode     = e.detail?.mode     ?? "fill"; // "fill" | "evaluate"
  removeCard();
  _dismissed = false;

  const job = jobTitle ? {
    title:       jobTitle,
    company:     e.detail?.company        ?? "",
    description: e.detail?.jobDescription ?? "",
  } : null;

  // "Evaluate First" flow — open on Evaluation tab and auto-run
  if (mode === "evaluate" && jobId && job) {
    openCardEvaluate(jobId, job);
    return;
  }

  // "Fill Application" / "Save & Apply" — job data passed directly in event detail
  if (jobId && job) {
    openCardDirect(jobId, job);
    return;
  }

  // Fallback: auto-trigger on ATS page (no job data in detail)
  openCard(jobId);
});

// ─── Auto-trigger on ATS pages ────────────────────────────────────────────────

// Wait for DOM ready + small delay so auto-fill.js has time to set up scan listener
function tryAutoTrigger() {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(checkAutoTrigger, 900);
  } else {
    window.addEventListener("load", () => setTimeout(checkAutoTrigger, 900), { once: true });
  }
}
tryAutoTrigger();

// Re-evaluate on SPA navigations (auto-fill.js fires nr:page-changed)
document.addEventListener("nr:page-changed", () => {
  _dismissed = false;
  _card = null;
  setTimeout(checkAutoTrigger, 900);
});

})();
