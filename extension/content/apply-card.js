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
  .nr-ac-err     { padding: 10px 12px; background: #faebeb; border-radius: 9px; font-size: 12px; color: #b53a3a; margin-bottom: 10px; }
  .nr-ac-hint    { font-size: 11.5px; color: #6b6358; margin-bottom: 10px; line-height: 1.45; }
  .nr-ac-divider { height: 1px; background: #ede8e0; margin: 12px 0; }
  .nr-ac-status  { font-size: 12px; color: #6b6358; margin-top: 8px; min-height: 16px; }

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

function swMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) { resolve(null); return; }
      resolve(res);
    });
  });
}

async function fetchArtifacts(jobId) {
  const res = await swMsg({ type: "GET_JOB_ARTIFACTS", jobId: jobId ?? undefined });
  if (!res?.ok) return null;
  return res;
}

// ─── Field scan protocol ──────────────────────────────────────────────────────

function requestFieldScan() {
  return new Promise((resolve) => {
    let settled = false;
    const handler = (e) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("nr:scan-res", handler);
      resolve(e.detail?.fields ?? []);
    };
    document.addEventListener("nr:scan-res", handler);
    document.dispatchEvent(new CustomEvent("nr:scan-req"));
    // Fallback: auto-fill.js might not be loaded (non-ATS page)
    setTimeout(() => {
      if (!settled) {
        settled = true;
        document.removeEventListener("nr:scan-res", handler);
        resolve([]);
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
  openCard(ctx.jobId ?? null);
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

async function loadConfirmScreen(jobId) {
  const inner = _card?.querySelector("#nr-ac-inner");
  if (!inner) return;

  inner.innerHTML = `
    <div class="nr-ac-body">
      <div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Loading your pipeline…</div>
    </div>`;

  const artifacts = await fetchArtifacts(jobId);

  if (artifacts) {
    const { recent_jobs = [], job = null, evaluation = null, resume = null } = artifacts;
    renderConfirmScreen(jobId, job, recent_jobs, evaluation, resume);
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
  inner.querySelector("#nr-ac-retry")?.addEventListener("click", () => loadConfirmScreen(jobId));
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

function renderConfirmScreen(currentJobId, currentJob, recentJobs, evaluation, resume) {
  const inner = _card?.querySelector("#nr-ac-inner");
  if (!inner) return;

  const pickerOpts = recentJobs.map((j) =>
    `<option value="${esc(j.id)}" ${j.id === currentJobId ? "selected" : ""}>
      ${esc(j.title)} — ${esc(j.company)}
    </option>`
  ).join("");

  inner.innerHTML = `
    <div class="nr-ac-body">
      <div class="nr-ac-confirm-title">Which job are you applying for?</div>
      <div class="nr-ac-confirm-sub">
        Confirm the job so we can load your evaluation and tailor your fill.
      </div>

      ${currentJob ? `
        <div class="nr-ac-label">Detected from page</div>
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
    if (!selectedId) return;

    const btn = inner.querySelector("#nr-ac-confirm-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }

    let job_ = currentJob, eval_ = evaluation, resume_ = resume;
    if (selectedId !== currentJobId) {
      const fresh = await fetchArtifacts(selectedId);
      if (fresh) { job_ = fresh.job; eval_ = fresh.evaluation; resume_ = fresh.resume; }
    }

    renderTabbedCard(selectedId, job_, eval_, resume_);
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
  container.innerHTML = `
    <div class="nr-ac-loading"><span class="nr-ac-spin"></span>&nbsp;Scanning form fields…</div>
  `;

  const fields = await requestFieldScan();

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

  buildRows();
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
      // Nothing found — fall through to "no eval" UI
    }

    container.innerHTML = `
      <div class="nr-ac-eval-empty">
        <div class="nr-ac-eval-empty-icon">✦</div>
        <div class="nr-ac-eval-empty-title">No evaluation yet</div>
        <div class="nr-ac-eval-empty-desc">
          Get an AI fit score, CV match analysis, compensation insights,
          and interview tips tailored to this role.
        </div>
        <button class="nr-ac-btn nr-ac-primary nr-ac-full" id="nr-ac-run-eval" style="margin-top:4px;">
          ✦ Evaluate My Fit
        </button>
        <div class="nr-ac-status" id="nr-ac-eval-st" style="text-align:center;margin-top:8px;"></div>
      </div>
    `;
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
      // Persist result into shared state so returning to this tab shows it again
      state.evaluation = {
        id: res.evaluation_id, score: res.score,
        decision: res.decision, blocks: res.blocks,
      };
      if (onEvalUpdated) onEvalUpdated();
      renderEvalTab(container, jobId, job, state, onEvalUpdated);
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
