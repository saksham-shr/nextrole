/**
 * NextRole Fill Assistant
 * Grammarly-style AI form-fill for job application pages.
 *
 * Activates on:
 *   - Known ATS domains (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, LinkedIn Easy Apply)
 *   - Any page with "apply" / "application" in the URL that contains a <form>
 *
 * On focus of a relevant text field:
 *   - Shows a small "✦ Fill" pill button below the field
 *   - Click → calls background FILL_SUGGEST → shows suggestion overlay
 *   - "Insert" fills the field (React-compatible via native setter)
 *   - "Copy" copies to clipboard
 *   - "✗" dismisses
 */

(function () {

// ─── Guard: only run on application pages ─────────────────────────────────────

const ATS_PATTERNS = [
  /boards\.greenhouse\.io/,
  /grnh\.se/,
  /jobs\.lever\.co/,
  /lever\.co\/apply/,
  /jobs\.ashbyhq\.com/,
  /myworkdayjobs\.com/,
  /smartrecruiters\.com/,
  /apply\.workable\.com/,
  /linkedin\.com\/jobs\/easy-apply/,
  /icims\.com/,
  /bamboohr\.com\/careers/,
  /jobs\.jobvite\.com/,
  /recruiting\.ultipro\.com/,
  /applytojob\.com/,
  /jazz\.co/,
  /\.recruitee\.com/,
  /\.breezy\.hr/,
  /jobs\.rippling\.com/,
  /\.freshteam\.com\/jobs/,
  /\.teamtailor\.com/,
  /jobs\.personio\./,
  /taleo\.net/,
];

const isAtsPage = ATS_PATTERNS.some((p) => p.test(location.href));
const isApplyPage = /apply|application/i.test(location.href) && !!document.querySelector("form");

if (!isAtsPage && !isApplyPage) return;

// ─── Inject styles ────────────────────────────────────────────────────────────

const STYLE = `
  .nr-fill-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    z-index: 2147483640;
    background: #c84a1f;
    color: #fffdf8;
    border: none;
    border-radius: 20px;
    padding: 3px 9px 3px 7px;
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(200,74,31,0.35);
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
    pointer-events: all;
  }
  .nr-fill-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .nr-fill-btn:active { transform: translateY(0); }
  .nr-fill-btn svg { flex-shrink: 0; }

  .nr-overlay {
    position: fixed;
    z-index: 2147483641;
    background: #fffdf8;
    border: 1.5px solid #c84a1f;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(26,24,20,0.18);
    width: 360px;
    max-width: calc(100vw - 24px);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    color: #1a1814;
    overflow: hidden;
  }

  .nr-overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    background: #c84a1f;
    color: #fffdf8;
  }
  .nr-overlay-header .nr-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .nr-overlay-header .nr-field-type {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    opacity: 0.8;
    text-transform: uppercase;
  }
  .nr-close-btn {
    background: none;
    border: none;
    color: rgba(255,253,248,0.7);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 15px;
    line-height: 1;
  }
  .nr-close-btn:hover { color: #fffdf8; }

  .nr-overlay-body { padding: 12px; }

  .nr-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    color: #6b6358;
    font-size: 12px;
  }
  .nr-spinner {
    width: 16px; height: 16px;
    border: 2px solid #e0d8d0;
    border-top-color: #c84a1f;
    border-radius: 50%;
    animation: nr-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes nr-spin { to { transform: rotate(360deg); } }

  .nr-suggestion-text {
    font-size: 12.5px;
    line-height: 1.65;
    color: #2a2620;
    max-height: 180px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 2px 0 10px;
    scrollbar-width: thin;
  }

  .nr-actions {
    display: flex;
    gap: 6px;
    padding-top: 4px;
    border-top: 1px solid #ede8e0;
    margin-top: 2px;
  }
  .nr-btn {
    flex: 1;
    padding: 7px 10px;
    border-radius: 8px;
    border: none;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .nr-btn:hover { opacity: 0.85; }
  .nr-btn-insert { background: #c84a1f; color: #fffdf8; }
  .nr-btn-copy   { background: #f0ebe3; color: #2a2620; }
  .nr-btn-retry  { background: #f0ebe3; color: #2a2620; }

  .nr-error {
    font-size: 12px;
    color: #b53a3a;
    padding: 4px 0 8px;
    line-height: 1.5;
  }
  .nr-upgrade-btn {
    display: block;
    width: 100%;
    padding: 7px 10px;
    border-radius: 8px;
    background: #c84a1f;
    color: #fffdf8;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-align: center;
    text-decoration: none;
    margin-bottom: 6px;
    cursor: pointer;
  }
  .nr-upgrade-btn:hover { opacity: 0.85; }
`;

function injectStyles() {
  if (document.getElementById("nr-fill-styles")) return;
  const el = document.createElement("style");
  el.id = "nr-fill-styles";
  el.textContent = STYLE;
  document.head.appendChild(el);
}

// ─── Field detection ──────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { type: "cover_letter",   pattern: /cover.?letter|covering.?letter/i },
  { type: "why_company",    pattern: /why.*(company|role|position|us)|what.*excit|interest.*role|motivation|draw.*to/i },
  { type: "about_yourself", pattern: /tell.*about.*yourself|about.*you|introduce|introduction|summary|background/i },
  { type: "experience",     pattern: /relevant.*experience|work.*experience|professional.*experience|describe.*experience/i },
  { type: "additional_info",pattern: /additional|anything.*else|other.*info|comments|notes|further/i },
];

const DIRECT_FIELDS = {
  full_name:   /\bfull.?name\b/i,
  first_name:  /\bfirst.?name\b|\bgiven.?name\b/i,
  last_name:   /\blast.?name\b|\bsurname\b|\bfamily.?name\b/i,
  email:       /\bemail\b/i,
  phone:       /\bphone\b|\bmobile\b|\btelephone\b/i,
  linkedin:    /linkedin/i,
  github:      /github/i,
  website:     /\bwebsite\b|\bportfolio\b|\burl\b/i,
  location:    /\bcity\b|\blocation\b|\bwhere.*based\b/i,
};

function getFieldLabel(el) {
  // 1. <label for="...">
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.innerText.trim();
  }
  // 2. aria-label
  if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
  // 3. placeholder
  if (el.placeholder) return el.placeholder.trim();
  // 4. Closest ancestor label
  const parentLabel = el.closest("label");
  if (parentLabel) return parentLabel.innerText.trim();
  // 5. Previous sibling text
  const prev = el.previousElementSibling;
  if (prev && prev.innerText) return prev.innerText.trim().slice(0, 80);
  // 6. name attribute
  return el.name || "";
}

function classifyField(el) {
  const label = getFieldLabel(el).toLowerCase();
  const name  = (el.name  || "").toLowerCase();
  const ph    = (el.placeholder || "").toLowerCase();
  const combined = `${label} ${name} ${ph}`;

  // Check direct (no-AI) fields first
  for (const [type, pattern] of Object.entries(DIRECT_FIELDS)) {
    if (pattern.test(combined)) return { type, needsAI: false, label: getFieldLabel(el) };
  }

  // AI fields (textarea or multi-line input only)
  if (el.tagName === "TEXTAREA" || el.type === "text" || el.type === "") {
    for (const { type, pattern } of FIELD_TYPES) {
      if (pattern.test(combined)) return { type, needsAI: true, label: getFieldLabel(el) };
    }
    // Generic textarea — always offer fill
    if (el.tagName === "TEXTAREA") return { type: "other", needsAI: true, label: getFieldLabel(el) };
  }

  return null;
}

// ─── Job context from current page ───────────────────────────────────────────

function getPageJobContext() {
  // Try to extract job title + company from the ATS application page
  let title = null, company = null, description = null;

  // Greenhouse apply page
  if (/greenhouse\.io|grnh\.se/.test(location.href)) {
    title = document.querySelector(".app-title, #header h1, h1")?.innerText?.trim() ?? null;
    company = document.querySelector(".company-name, .logo-text")?.innerText?.trim() ?? null;
  }
  // Lever
  else if (/lever\.co/.test(location.href)) {
    title = document.querySelector("[data-qa='posting-name'], .posting-headline h2, h2")?.innerText?.trim() ?? null;
    const parts = location.pathname.split("/").filter(Boolean);
    company = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, " ") : null;
  }
  // Ashby
  else if (/ashbyhq\.com/.test(location.href)) {
    title = document.querySelector("h1")?.innerText?.trim() ?? null;
    const parts = location.pathname.split("/").filter(Boolean);
    company = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, " ") : null;
  }
  // LinkedIn
  else if (/linkedin\.com/.test(location.href)) {
    title = document.querySelector(".job-details-jobs-unified-top-card__job-title, h1")?.innerText?.trim() ?? null;
    company = document.querySelector(".job-details-jobs-unified-top-card__company-name")?.innerText?.trim() ?? null;
  }
  // Generic / Workday / SmartRecruiters
  else {
    title = document.querySelector("h1, h2")?.innerText?.trim() ?? null;
    company = document.querySelector("meta[property='og:site_name']")?.getAttribute("content") ?? null;
  }

  // Try to get job description snippet from the page
  const descEl = document.querySelector(
    ".job-description, #job-description, [class*='job-description'], [class*='jobDescription'], article, main"
  );
  description = descEl ? descEl.innerText.slice(0, 2000).trim() : null;

  return { jobTitle: title ?? "", company: company ?? "", jobDescription: description ?? "" };
}

// ─── Native input fill (React-compatible) ─────────────────────────────────────

function fillField(el, value) {
  const proto = el.tagName === "TEXTAREA"
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

let activeOverlay = null;
let activeBtn     = null;

function removeOverlay() {
  activeOverlay?.remove();
  activeBtn?.remove();
  activeOverlay = null;
  activeBtn     = null;
}

function positionNear(el) {
  const rect = el.getBoundingClientRect();
  const scrollX = window.scrollX, scrollY = window.scrollY;
  return {
    top:  rect.bottom + scrollY + 6,
    left: Math.min(rect.left + scrollX, window.innerWidth + scrollX - 380),
  };
}

function showOverlay({ el, fieldMeta, suggestion, error, loading, upgrade = false }) {
  removeOverlay();

  const pos = positionNear(el);
  const overlay = document.createElement("div");
  overlay.className = "nr-overlay";
  overlay.style.top  = pos.top  + "px";
  overlay.style.left = pos.left + "px";

  const typeLabel = {
    cover_letter:   "Cover Letter",
    why_company:    "Why This Company",
    about_yourself: "About Yourself",
    experience:     "Experience",
    additional_info:"Additional Info",
    other:          fieldMeta.label || "Field Fill",
  }[fieldMeta.type] ?? (fieldMeta.label || "Field Fill");

  overlay.innerHTML = `
    <div class="nr-overlay-header">
      <div class="nr-brand">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="rgba(255,253,248,0.2)"/>
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole Fill
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="nr-field-type">${typeLabel}</span>
        <button class="nr-close-btn" title="Dismiss">×</button>
      </div>
    </div>
    <div class="nr-overlay-body">
      ${loading ? `<div class="nr-loading"><div class="nr-spinner"></div><span>Generating…</span></div>` : ""}
      ${error   ? `<div class="nr-error">${error}</div>` : ""}
      ${suggestion ? `<div class="nr-suggestion-text">${escapeHtml(suggestion)}</div>` : ""}
      ${upgrade ? `<a href="${NEXTROLE_URL}/pricing" target="_blank" class="nr-upgrade-btn">Upgrade Plan →</a>` : ""}
      ${(suggestion || (error && !upgrade)) ? `
        <div class="nr-actions">
          ${suggestion ? `<button class="nr-btn nr-btn-insert">Insert</button>` : ""}
          ${suggestion ? `<button class="nr-btn nr-btn-copy">Copy</button>` : ""}
          ${error && !upgrade ? `<button class="nr-btn nr-btn-retry">Retry</button>` : ""}
        </div>
      ` : ""}
    </div>
  `;

  // Wire up buttons
  overlay.querySelector(".nr-close-btn")?.addEventListener("click", removeOverlay);

  overlay.querySelector(".nr-btn-insert")?.addEventListener("click", () => {
    fillField(el, suggestion);
    removeOverlay();
  });

  overlay.querySelector(".nr-btn-copy")?.addEventListener("click", () => {
    navigator.clipboard.writeText(suggestion).catch(() => {});
    const btn = overlay.querySelector(".nr-btn-copy");
    if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 1500); }
  });

  overlay.querySelector(".nr-btn-retry")?.addEventListener("click", () => {
    removeOverlay();
    requestSuggestion(el, fieldMeta);
  });

  document.body.appendChild(overlay);
  activeOverlay = overlay;
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ─── Pill button ──────────────────────────────────────────────────────────────

function showFillButton(el, fieldMeta) {
  if (activeBtn) activeBtn.remove();

  const rect = el.getBoundingClientRect();
  const btn  = document.createElement("button");
  btn.className = "nr-fill-btn";
  btn.innerHTML = `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    Fill
  `;

  // Position at bottom-right corner of the field
  const scrollX = window.scrollX, scrollY = window.scrollY;
  btn.style.top    = (rect.bottom + scrollY - 2)  + "px";
  btn.style.left   = (rect.right  + scrollX - 68) + "px";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    requestSuggestion(el, fieldMeta);
  });

  document.body.appendChild(btn);
  activeBtn = btn;
}

// ─── Request suggestion from background ──────────────────────────────────────

async function requestSuggestion(el, fieldMeta) {
  const session = await getSession();
  if (!session.loggedIn) {
    showOverlay({ el, fieldMeta, loading: false, error: "Not signed in — open extension settings to log in.", suggestion: null });
    return;
  }

  const ctx = getPageJobContext();
  showOverlay({ el, fieldMeta, loading: true, error: null, suggestion: null });

  chrome.runtime.sendMessage(
    {
      type: "FILL_SUGGEST",
      payload: {
        field_type:      fieldMeta.type,
        field_label:     fieldMeta.label,
        job_title:       ctx.jobTitle,
        company:         ctx.company,
        job_description: ctx.jobDescription,
        current_value:   el.value ?? "",
      },
    },
    (response) => {
      if (chrome.runtime.lastError || !response) {
        showOverlay({ el, fieldMeta, loading: false, error: "Extension error — try reloading the page.", suggestion: null });
        return;
      }
      if (response.ok) {
        showOverlay({ el, fieldMeta, loading: false, error: null, suggestion: response.suggestion, upgrade: false });
      } else {
        showOverlay({ el, fieldMeta, loading: false, error: response.error ?? "Unknown error", suggestion: null, upgrade: !!response.upgrade });
      }
    }
  );
}

function getSession() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
      if (chrome.runtime.lastError || !res) { resolve({ ok: false, loggedIn: false }); return; }
      resolve(res);
    });
  });
}

// ─── Attach listeners to a field element ─────────────────────────────────────

const OBSERVED = new WeakSet();

function attachToField(el) {
  if (OBSERVED.has(el)) return;
  const meta = classifyField(el);
  if (!meta) return;
  OBSERVED.add(el);

  // Only offer AI fill for appropriate fields (skip email / name / phone — direct fill only)
  if (!meta.needsAI) return;

  el.addEventListener("focus", () => {
    injectStyles();
    showFillButton(el, meta);
  });

  el.addEventListener("blur", () => {
    // Delay so click on button fires first
    setTimeout(() => {
      if (!activeOverlay) activeBtn?.remove();
    }, 200);
  });
}

// ─── Observe DOM ──────────────────────────────────────────────────────────────

function scanFields() {
  document.querySelectorAll("input[type='text'], input[type=''], input:not([type]), textarea").forEach(attachToField);
}

// Run on load
injectStyles();
scanFields();

// Re-scan as SPA navigations / dynamic forms render
const observer = new MutationObserver(() => scanFields());
observer.observe(document.body, { childList: true, subtree: true });

// Close overlay on outside click
document.addEventListener("mousedown", (e) => {
  if (activeOverlay && !activeOverlay.contains(e.target) && e.target !== activeBtn) {
    removeOverlay();
  }
}, true);

// Close overlay on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") removeOverlay();
}, true);

})();
