/**
 * NextRole Auto-fill Assistant
 *
 * Floating Action Button (FAB) on job application pages.
 * One click fills every detected form field — direct fields (name, email,
 * phone, LinkedIn…) instantly from profile; AI fields (cover letter,
 * why this company…) via /api/extension/suggest.
 *
 * After filling, a "Submit application" button appears that finds and
 * clicks the form's primary submit/next button with a confirmation prompt.
 */

(function () {

// ─── Guard: ATS / application pages only ─────────────────────────────────────

const AF_ATS = [
  /boards\.greenhouse\.io/,
  /grnh\.se/,
  /jobs\.lever\.co/,
  /jobs\.ashbyhq\.com/,
  /myworkdayjobs\.com/,
  /smartrecruiters\.com/,
  /apply\.workable\.com/,
  /linkedin\.com\/jobs\/easy-apply/,
  /icims\.com/,
  /bamboohr\.com\/careers/,
  /recruiting\.ultipro\.com/,
];

const isAfAts   = AF_ATS.some((p) => p.test(location.href));
const isAfApply = /apply|application/i.test(location.href) && !!document.querySelector("form");

if (!isAfAts && !isAfApply) return;

// ─── Inject styles ────────────────────────────────────────────────────────────

const AF_STYLE = `
  #nr-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: #c84a1f;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(200,74,31,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  #nr-fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(200,74,31,0.55); }

  #nr-panel {
    position: fixed;
    bottom: 80px;
    right: 24px;
    z-index: 2147483646;
    width: 320px;
    max-height: 520px;
    background: #fffdf8;
    border: 1.5px solid #2a2620;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(26,24,20,0.18);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    color: #1a1814;
    display: none;
    flex-direction: column;
    overflow: hidden;
  }
  #nr-panel.open { display: flex; }

  .nr-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #1a1814;
    color: #fffdf8;
    flex-shrink: 0;
  }
  .nr-panel-brand {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .nr-panel-close {
    background: none; border: none;
    color: rgba(255,253,248,0.5);
    cursor: pointer; font-size: 16px; line-height: 1;
    padding: 2px 4px; border-radius: 4px;
  }
  .nr-panel-close:hover { color: #fffdf8; }

  .nr-panel-body {
    padding: 14px;
    overflow-y: auto;
    flex: 1;
  }

  .nr-job-line {
    font-size: 11.5px;
    color: #6b6358;
    margin-bottom: 12px;
    line-height: 1.5;
  }
  .nr-job-line strong { color: #1a1814; }

  .nr-field-count {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9a9286;
    margin-bottom: 10px;
  }

  .nr-progress-bar {
    height: 4px;
    background: #ede8e0;
    border-radius: 2px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .nr-progress-fill {
    height: 100%;
    background: #c84a1f;
    border-radius: 2px;
    transition: width 0.3s;
    width: 0%;
  }

  .nr-field-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
    max-height: 200px;
    overflow-y: auto;
  }
  .nr-field-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 8px;
    background: #f5f0e8;
    font-size: 11.5px;
  }
  .nr-field-item.done   { background: #eef8f0; }
  .nr-field-item.skip   { background: #f5f0e8; opacity: 0.5; }
  .nr-field-item.error  { background: #faebeb; }
  .nr-field-item.filling { background: #fff5f0; }

  .nr-field-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nr-field-tag {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .nr-field-item.done   .nr-field-tag { color: #2f7a3a; }
  .nr-field-item.skip   .nr-field-tag { color: #9a9286; }
  .nr-field-item.error  .nr-field-tag { color: #b53a3a; }
  .nr-field-item.filling .nr-field-tag { color: #c84a1f; }

  .nr-af-btn {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    border: none;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.15s;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .nr-af-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .nr-af-btn:hover:not(:disabled) { opacity: 0.85; }
  .nr-af-primary  { background: #c84a1f; color: #fffdf8; }
  .nr-af-submit   { background: #1a1814; color: #fffdf8; }
  .nr-af-secondary{ background: #f0ebe3; color: #2a2620; }

  .nr-af-error {
    font-size: 11.5px;
    color: #b53a3a;
    margin-bottom: 8px;
    line-height: 1.5;
  }
  .nr-af-note {
    font-size: 11px;
    color: #9a9286;
    margin-top: 4px;
    line-height: 1.5;
  }

  .nr-confirm-modal {
    position: fixed;
    inset: 0;
    z-index: 2147483648;
    background: rgba(26,24,20,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .nr-confirm-box {
    background: #fffdf8;
    border: 1.5px solid #2a2620;
    border-radius: 14px;
    padding: 24px;
    width: 300px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    color: #1a1814;
  }
  .nr-confirm-box h3 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .nr-confirm-box p {
    font-size: 12px;
    color: #6b6358;
    margin-bottom: 16px;
    line-height: 1.6;
  }
  .nr-confirm-btns {
    display: flex;
    gap: 8px;
  }
  .nr-confirm-btns button {
    flex: 1;
    padding: 9px;
    border-radius: 8px;
    border: none;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .nr-confirm-yes { background: #c84a1f; color: #fffdf8; }
  .nr-confirm-no  { background: #f0ebe3; color: #2a2620; }
`;

function injectAfStyles() {
  if (document.getElementById("nr-af-styles")) return;
  const el = document.createElement("style");
  el.id = "nr-af-styles";
  el.textContent = AF_STYLE;
  document.head.appendChild(el);
}

// ─── Field classification ─────────────────────────────────────────────────────

const DIRECT_MAP = {
  full_name:  [/\bfull.?name\b|\byour.?name\b/i],
  first_name: [/\bfirst.?name\b|\bgiven.?name\b|\bforename\b/i],
  last_name:  [/\blast.?name\b|\bsurname\b|\bfamily.?name\b/i],
  email:      [/\bemail\b/i],
  phone:      [/\bphone\b|\bmobile\b|\btelephone\b|\bcell\b/i],
  linkedin:   [/\blinkedin\b/i],
  github:     [/\bgithub\b/i],
  website:    [/\bwebsite\b|\bportfolio\b|\bpersonal.?url\b/i],
  location:   [/\bcity\b|\blocation\b|\bwhere.*based\b|\bcountry\b/i],
  salary:     [/\bsalary\b|\bcompensation\b|\bexpected.?pay\b|\bdesired.?salary\b/i],
};

const AI_MAP = [
  { type: "cover_letter",   pattern: /cover.?letter|covering.?letter/i },
  { type: "why_company",    pattern: /why.*(company|role|position|us)|what.*excit|motivation|draw.*to/i },
  { type: "about_yourself", pattern: /tell.*about.*yourself|about.*you|introduce|introduction|summary|background/i },
  { type: "experience",     pattern: /relevant.*experience|work.*experience|describe.*experience/i },
  { type: "additional_info",pattern: /additional|anything.*else|other.*info|comments/i },
];

function getFieldLabel(el) {
  const id = el.id;
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl) return lbl.innerText.trim();
  }
  if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
  if (el.placeholder) return el.placeholder.trim();
  const parentLabel = el.closest("label");
  if (parentLabel) return parentLabel.innerText.trim();
  const prev = el.previousElementSibling;
  if (prev?.innerText) return prev.innerText.trim().slice(0, 80);
  return el.name || el.id || "";
}

function classifyField(el) {
  if (el.type === "hidden" || el.type === "submit" || el.type === "button"
      || el.type === "checkbox" || el.type === "radio") return null;

  const label    = getFieldLabel(el).toLowerCase();
  const name     = (el.name || "").toLowerCase();
  const ph       = (el.placeholder || "").toLowerCase();
  const combined = `${label} ${name} ${ph}`;

  // Direct fill
  for (const [type, patterns] of Object.entries(DIRECT_MAP)) {
    if (patterns.some((p) => p.test(combined))) {
      return { type, kind: "direct", label: getFieldLabel(el) };
    }
  }

  // AI fill (textareas and multi-row text inputs)
  const isMultiline = el.tagName === "TEXTAREA" || Number(el.getAttribute("rows")) > 2;
  if (isMultiline) {
    for (const { type, pattern } of AI_MAP) {
      if (pattern.test(combined)) return { type, kind: "ai", label: getFieldLabel(el) };
    }
    // Generic textarea — offer AI fill with generic prompt
    return { type: "other", kind: "ai", label: getFieldLabel(el) };
  }

  return null;
}

function getDirectValue(type, profile) {
  switch (type) {
    case "full_name":  return profile.full_name  ?? "";
    case "first_name": return profile.first_name ?? "";
    case "last_name":  return profile.last_name  ?? "";
    case "email":      return profile.email      ?? "";
    case "phone":      return profile.phone      ?? "";
    case "linkedin":   return profile.linkedin   ?? "";
    case "github":     return profile.github     ?? "";
    case "website":    return profile.website    ?? "";
    case "location":   return profile.location   ?? "";
    case "salary":     return profile.salary     ?? "";
    default:           return "";
  }
}

// ─── Native fill (React-compatible) ──────────────────────────────────────────

function nativeFill(el, value) {
  if (!value) return;
  const proto = el.tagName === "TEXTAREA"
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value); else el.value = value;
  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSession() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
      if (chrome.runtime.lastError || !res) { resolve({ ok: false, loggedIn: false }); return; }
      resolve(res);
    });
  });
}

function getLastJob() {
  return new Promise((resolve) => {
    chrome.storage.session.get(["nr_last_job_id", "nr_last_job_title", "nr_last_company"], (d) => {
      resolve({ jobId: d.nr_last_job_id ?? null, jobTitle: d.nr_last_job_title ?? "", company: d.nr_last_company ?? "" });
    });
  });
}

function getPageJobContext() {
  let title = null, company = null, description = null;
  if (/greenhouse\.io|grnh\.se/.test(location.href)) {
    title   = document.querySelector(".app-title, #header h1, h1")?.innerText?.trim() ?? null;
    company = document.querySelector(".company-name, .logo-text")?.innerText?.trim() ?? null;
  } else if (/lever\.co/.test(location.href)) {
    title = document.querySelector("[data-qa='posting-name'], h2, h1")?.innerText?.trim() ?? null;
    const parts = location.pathname.split("/").filter(Boolean);
    company = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, " ") : null;
  } else if (/ashbyhq\.com/.test(location.href)) {
    title = document.querySelector("h1")?.innerText?.trim() ?? null;
    const parts = location.pathname.split("/").filter(Boolean);
    company = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, " ") : null;
  } else {
    title = document.querySelector("h1, h2")?.innerText?.trim() ?? null;
    company = document.querySelector("meta[property='og:site_name']")?.getAttribute("content") ?? null;
  }
  const descEl = document.querySelector(".job-description, #job-description, [class*='jobDescription'], article, main");
  description = descEl ? descEl.innerText.slice(0, 2000).trim() : null;
  return { jobTitle: title ?? "", company: company ?? "", jobDescription: description ?? "" };
}

function escapeHtml(s) {
  return (s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ─── Scan all fillable fields on the page ────────────────────────────────────

function scanFormFields() {
  const fields = [];
  const seen = new WeakSet();
  document.querySelectorAll(
    "input[type='text'], input[type='email'], input[type='tel'], input[type='url'], input[type='number'], input:not([type]), textarea"
  ).forEach((el) => {
    if (seen.has(el)) return;
    const meta = classifyField(el);
    if (!meta) return;
    seen.add(el);
    fields.push({ el, meta });
  });
  return fields;
}

// ─── Submit button detection ──────────────────────────────────────────────────

function findSubmitButton() {
  // Priority: explicit submit inputs/buttons, then buttons with submit-like text
  const explicit = document.querySelector(
    "input[type='submit'], button[type='submit']"
  );
  if (explicit) return explicit;

  const candidates = [...document.querySelectorAll("button, input[type='button']")];
  return candidates.find((b) => {
    const t = (b.innerText || b.value || "").toLowerCase();
    return /submit|apply now|send application|next step|continue/i.test(t);
  }) ?? null;
}

// ─── Core: auto-fill all fields ──────────────────────────────────────────────

async function runAutoFill(panel) {
  const session = await getSession();
  if (!session.loggedIn) {
    renderPanel(panel, "error", null, "Not signed in — open extension settings to log in.");
    return;
  }

  // Fetch profile
  const profileResult = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, resolve);
  });

  if (!profileResult?.ok) {
    renderPanel(panel, "error", null, profileResult?.error ?? "Could not load profile.");
    return;
  }

  const profile  = profileResult.profile;
  const fields   = scanFormFields();
  const lastJob  = await getLastJob();
  const pageCtx  = getPageJobContext();
  const jobTitle = lastJob.jobTitle || pageCtx.jobTitle;
  const company  = lastJob.company  || pageCtx.company;
  const jobDesc  = pageCtx.jobDescription;

  if (fields.length === 0) {
    renderPanel(panel, "no_fields", null, null);
    return;
  }

  // Build field status list
  const statuses = fields.map((f) => ({
    label: f.meta.label || f.meta.type,
    kind:  f.meta.kind,
    state: "pending",
  }));

  renderPanel(panel, "filling", { fields: statuses, total: fields.length, done: 0 }, null, { jobTitle, company });

  let doneCount = 0;

  // Fill direct fields immediately
  for (let i = 0; i < fields.length; i++) {
    const { el, meta } = fields[i];
    if (meta.kind !== "direct") continue;

    const value = getDirectValue(meta.type, profile);
    if (value) {
      nativeFill(el, value);
      statuses[i].state = "done";
    } else {
      statuses[i].state = "skip";
    }
    doneCount++;
    renderPanel(panel, "filling", { fields: statuses, total: fields.length, done: doneCount }, null, { jobTitle, company });
  }

  // Fill AI fields concurrently (max 3 at once)
  const aiFields = fields.map((f, i) => ({ ...f, index: i })).filter((f) => f.meta.kind === "ai");
  let needsUpgrade = false;

  async function fillAiField(f) {
    statuses[f.index].state = "filling";
    renderPanel(panel, "filling", { fields: statuses, total: fields.length, done: doneCount, needsUpgrade }, null, { jobTitle, company });

    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "FILL_SUGGEST",
        payload: {
          field_type:      f.meta.type,
          field_label:     f.meta.label,
          job_title:       jobTitle,
          company,
          job_description: jobDesc,
          current_value:   f.el.value ?? "",
        },
      }, resolve);
    });

    if (result?.ok && result.suggestion) {
      nativeFill(f.el, result.suggestion);
      statuses[f.index].state = "done";
    } else {
      if (result?.upgrade) needsUpgrade = true;
      statuses[f.index].state = "error";
    }
    doneCount++;
    renderPanel(panel, "filling", { fields: statuses, total: fields.length, done: doneCount, needsUpgrade }, null, { jobTitle, company });
  }

  // Process AI fields in batches of 3
  for (let i = 0; i < aiFields.length; i += 3) {
    await Promise.allSettled(aiFields.slice(i, i + 3).map(fillAiField));
  }

  renderPanel(panel, "done", { fields: statuses, total: fields.length, done: doneCount, needsUpgrade }, null, { jobTitle, company });
}

// ─── Submit with confirmation modal ──────────────────────────────────────────

function confirmAndSubmit(company) {
  const modal = document.createElement("div");
  modal.className = "nr-confirm-modal";
  modal.innerHTML = `
    <div class="nr-confirm-box">
      <h3>Submit application?</h3>
      <p>This will click the submit button${company ? ` and send your application to <strong>${escapeHtml(company)}</strong>` : ""}. Make sure all fields are correct before continuing.</p>
      <div class="nr-confirm-btns">
        <button class="nr-confirm-yes">Yes, submit</button>
        <button class="nr-confirm-no">Cancel</button>
      </div>
    </div>
  `;
  modal.querySelector(".nr-confirm-no").addEventListener("click", () => modal.remove());
  modal.querySelector(".nr-confirm-yes").addEventListener("click", () => {
    modal.remove();
    const btn = findSubmitButton();
    if (btn) {
      btn.click();
    } else {
      alert("NextRole: Could not find a submit button on this page. Please submit manually.");
    }
  });
  document.body.appendChild(modal);
}

// ─── Panel render ─────────────────────────────────────────────────────────────

function renderPanel(panel, state, fillData, errorMsg, ctx) {
  const body = panel.querySelector(".nr-panel-body");
  if (!body) return;

  const { jobTitle, company } = ctx ?? {};

  if (state === "idle") {
    const fields = scanFormFields();
    body.innerHTML = `
      ${jobTitle || company ? `<div class="nr-job-line">Applying for <strong>${escapeHtml(jobTitle || "this role")}${company ? ` at ${escapeHtml(company)}` : ""}</strong></div>` : ""}
      <div class="nr-field-count">${fields.length} fillable field${fields.length !== 1 ? "s" : ""} detected</div>
      <button class="nr-af-btn nr-af-primary" id="nr-do-fill">
        ⚡ Auto-fill all fields
      </button>
      <div class="nr-af-note">Fills name, email, phone, LinkedIn + generates cover letter and other text fields using AI.</div>
    `;
    body.querySelector("#nr-do-fill")?.addEventListener("click", () => runAutoFill(panel));
    return;
  }

  if (state === "error") {
    body.innerHTML = `
      <div class="nr-af-error">${escapeHtml(errorMsg)}</div>
      <button class="nr-af-btn nr-af-secondary" id="nr-retry-fill">Retry</button>
    `;
    body.querySelector("#nr-retry-fill")?.addEventListener("click", () => runAutoFill(panel));
    return;
  }

  if (state === "no_fields") {
    body.innerHTML = `<div class="nr-af-error">No fillable fields detected on this page.</div>`;
    return;
  }

  if (state === "filling" || state === "done") {
    const { fields, total, done, needsUpgrade } = fillData;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const doneCount = fields.filter((f) => f.state === "done").length;

    const listHtml = fields.map((f) => {
      const tagLabel = {
        done:    "✓ filled",
        skip:    "— empty",
        error:   "✗ error",
        filling: "ai…",
        pending: "waiting",
      }[f.state] ?? f.state;
      return `<div class="nr-field-item ${f.state}">
        <span class="nr-field-name">${escapeHtml(f.label || f.kind)}</span>
        <span class="nr-field-tag">${tagLabel}</span>
      </div>`;
    }).join("");

    const isFinished = state === "done";

    body.innerHTML = `
      ${jobTitle || company ? `<div class="nr-job-line"><strong>${escapeHtml(jobTitle || "")}${company ? ` · ${escapeHtml(company)}` : ""}</strong></div>` : ""}
      <div class="nr-field-count">${isFinished ? `✓ ${doneCount}/${total} fields filled` : `Filling ${done}/${total}…`}</div>
      <div class="nr-progress-bar"><div class="nr-progress-fill" style="width:${pct}%"></div></div>
      <div class="nr-field-list">${listHtml}</div>
      ${isFinished && needsUpgrade ? `
        <div class="nr-af-error" style="margin-bottom:8px">AI fields require a plan upgrade.</div>
        <a href="${NEXTROLE_URL}/pricing" target="_blank" class="nr-af-btn nr-af-primary" style="text-decoration:none;margin-bottom:6px;display:flex;">Upgrade Plan →</a>
      ` : ""}
      ${isFinished ? `
        <button class="nr-af-btn nr-af-submit" id="nr-do-submit">→ Submit application</button>
        <button class="nr-af-btn nr-af-secondary" id="nr-refill">Re-fill</button>
      ` : ""}
    `;

    if (isFinished) {
      body.querySelector("#nr-do-submit")?.addEventListener("click", () => confirmAndSubmit(company));
      body.querySelector("#nr-refill")?.addEventListener("click", () => runAutoFill(panel));
    }
  }
}

// ─── FAB + Panel ──────────────────────────────────────────────────────────────

function buildFab() {
  injectAfStyles();

  // FAB button
  const fab = document.createElement("button");
  fab.id = "nr-fab";
  fab.title = "NextRole Auto-fill";
  fab.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
      <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Panel
  const panel = document.createElement("div");
  panel.id = "nr-panel";
  panel.innerHTML = `
    <div class="nr-panel-header">
      <div class="nr-panel-brand">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole
      </div>
      <button class="nr-panel-close">×</button>
    </div>
    <div class="nr-panel-body"></div>
  `;

  // Wire close button
  panel.querySelector(".nr-panel-close").addEventListener("click", () => {
    panel.classList.remove("open");
  });

  // Toggle panel on FAB click
  const pageCtx = getPageJobContext();
  fab.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("open");
    if (isOpen) {
      getLastJob().then((lastJob) => {
        renderPanel(panel, "idle", null, null, {
          jobTitle: lastJob.jobTitle || pageCtx.jobTitle,
          company:  lastJob.company  || pageCtx.company,
        });
      });
    }
  });

  // Close panel on outside click
  document.addEventListener("mousedown", (e) => {
    if (!panel.contains(e.target) && e.target !== fab) {
      panel.classList.remove("open");
    }
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") panel.classList.remove("open");
  }, true);

  document.body.appendChild(fab);
  document.body.appendChild(panel);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

buildFab();

})();
