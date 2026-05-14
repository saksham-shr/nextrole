/**
 * NextRole Resume Upload Assistant
 *
 * Detects <input type="file"> fields on job application pages.
 * Shows a "📄 Tailor resume" button next to each file input.
 *
 * Flow:
 *   1. User clicks "Tailor resume" → extension calls /api/extension/resume
 *   2. API returns rendered HTML → extension opens it as a blob URL in a new tab
 *   3. The HTML auto-triggers window.print() → browser Save-as-PDF dialog opens
 *   4. User saves PDF → uploads to the file input
 *
 * The last captured job_id is read from chrome.storage.session (set by popup.js
 * after a successful Phase 4 capture).  Falls back to page-detected job context.
 */

(function () {

// ─── Guard: ATS / application pages only ─────────────────────────────────────

const RESUME_ATS = [
  /boards\.greenhouse\.io/,
  /grnh\.se/,
  /jobs\.lever\.co/,
  /lever\.co\/apply/,
  /jobs\.ashbyhq\.com/,
  /myworkdayjobs\.com/,
  /jobs\.workday\.com/,
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
  /oraclecloud\.com\/hcmUI/,
  /fa\.[a-z0-9]+\.oraclecloud\.com/,
  /oracle\.com\/.*apply/,
  /naukri\.com/,
  /indeed\.com\/apply/,
];

const isResumeAts    = RESUME_ATS.some((p) => p.test(location.href));
const isResumeApply  = /apply|application/i.test(location.href) && !!document.querySelector("form");

if (!isResumeAts && !isResumeApply) return;

// ─── Inject styles ───────────────────────────���────────────────────────────────

const RESUME_STYLE = `
  .nr-resume-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #fffdf8;
    color: #c84a1f;
    border: 1.5px solid #c84a1f;
    border-radius: 20px;
    padding: 5px 11px;
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
    margin-top: 6px;
  }
  .nr-resume-btn:hover { background: #c84a1f; color: #fffdf8; }

  .nr-resume-overlay {
    position: fixed;
    z-index: 2147483641;
    background: #fffdf8;
    border: 1.5px solid #c84a1f;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(26,24,20,0.18);
    width: 340px;
    max-width: calc(100vw - 24px);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    color: #1a1814;
    overflow: hidden;
  }

  .nr-resume-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    background: #c84a1f;
    color: #fffdf8;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .nr-resume-close {
    background: none; border: none;
    color: rgba(255,253,248,0.7);
    cursor: pointer; font-size: 15px; line-height: 1;
    padding: 2px 4px; border-radius: 4px;
  }
  .nr-resume-close:hover { color: #fffdf8; }

  .nr-resume-body { padding: 14px; }

  .nr-resume-spinner {
    display: flex; align-items: center; gap: 10px;
    color: #6b6358; font-size: 12px; padding: 4px 0 10px;
  }
  .nr-resume-spin {
    width: 16px; height: 16px;
    border: 2px solid #e0d8d0; border-top-color: #c84a1f;
    border-radius: 50%;
    animation: nr-rspin 0.7s linear infinite; flex-shrink: 0;
  }
  @keyframes nr-rspin { to { transform: rotate(360deg); } }

  .nr-resume-status {
    font-size: 12px; line-height: 1.6; color: #2a2620; padding-bottom: 10px;
  }
  .nr-resume-coverage {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #2f7a3a; margin-bottom: 10px;
  }
  .nr-resume-error { font-size: 12px; color: #b53a3a; padding-bottom: 10px; }

  .nr-resume-actions { display: flex; gap: 6px; }
  .nr-resume-act {
    flex: 1; padding: 8px 10px;
    border-radius: 8px; border: none;
    font-family: 'DM Mono', monospace;
    font-size: 10px; font-weight: 500;
    letter-spacing: 0.12em; text-transform: uppercase;
    cursor: pointer; transition: opacity 0.15s;
  }
  .nr-resume-act:hover { opacity: 0.85; }
  .nr-resume-act-primary { background: #c84a1f; color: #fffdf8; }
  .nr-resume-act-sec     { background: #f0ebe3; color: #2a2620; }

  .nr-resume-steps {
    margin-top: 10px;
    padding: 10px 12px;
    background: #f0ebe3;
    border-radius: 8px;
    font-size: 11px;
    color: #6b6358;
    line-height: 1.7;
  }
  .nr-resume-steps ol { padding-left: 16px; margin: 0; }
`;

function injectResumeStyles() {
  if (document.getElementById("nr-resume-styles")) return;
  const el = document.createElement("style");
  el.id = "nr-resume-styles";
  el.textContent = RESUME_STYLE;
  document.head.appendChild(el);
}

// ─── Helpers ─────────────────────────────────────────────────────────���────────

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("nr_ext_token", (d) => resolve(d.nr_ext_token ?? ""));
  });
}

function getLastJob() {
  return new Promise((resolve) => {
    chrome.storage.session.get(["nr_last_job_id", "nr_last_job_title", "nr_last_company"], (d) => {
      resolve({
        jobId:    d.nr_last_job_id    ?? null,
        jobTitle: d.nr_last_job_title ?? "",
        company:  d.nr_last_company   ?? "",
      });
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
  description = descEl ? descEl.innerText.slice(0, 3000).trim() : null;
  return { jobTitle: title ?? "", company: company ?? "", jobDescription: description ?? "" };
}

// ─── Open resume in new tab as blob (triggers auto-print) ─────────────��──────

function openResumeBlob(html) {
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  chrome.runtime.sendMessage({ type: "OPEN_TAB", url });
}

// ─── Overlay ─────────────────────���─────────────────────────────────���──────────

let activeResumeOverlay = null;

function removeResumeOverlay() {
  activeResumeOverlay?.remove();
  activeResumeOverlay = null;
}

function showResumeOverlay({ anchor, state, error, coverage, jobTitle, company }) {
  removeResumeOverlay();

  // position:fixed — viewport-relative, no scroll offsets needed
  // (Oracle HCM, Workday scroll inside custom divs so window.scrollY = 0)
  const rect = anchor.getBoundingClientRect();

  const overlay = document.createElement("div");
  overlay.className = "nr-resume-overlay";
  overlay.style.top  = (rect.bottom + 8) + "px";
  overlay.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 364)) + "px";

  let bodyHtml = "";

  if (state === "loading") {
    bodyHtml = `
      <div class="nr-resume-spinner">
        <div class="nr-resume-spin"></div>
        <span>Tailoring your resume to ${escapeHtml(jobTitle || "this role")}…</span>
      </div>`;
  } else if (state === "error") {
    bodyHtml = `
      <div class="nr-resume-error">${escapeHtml(error)}</div>
      <div class="nr-resume-actions">
        <button class="nr-resume-act nr-resume-act-sec nr-retry">Retry</button>
      </div>`;
  } else if (state === "done") {
    bodyHtml = `
      <div class="nr-resume-coverage">✓ ${coverage}% keyword match · ${escapeHtml(jobTitle || "")}${company ? ` at ${escapeHtml(company)}` : ""}</div>
      <div class="nr-resume-status">Your tailored resume is ready. It will open in a new tab with the print dialog.</div>
      <div class="nr-resume-actions">
        <button class="nr-resume-act nr-resume-act-primary nr-open-pdf">Open + Save PDF</button>
        <button class="nr-resume-act nr-resume-act-sec nr-view-dash">View in NextRole</button>
      </div>
      <div class="nr-resume-steps">
        <ol>
          <li>Click <strong>Open + Save PDF</strong></li>
          <li>In the print dialog → <strong>Save as PDF</strong></li>
          <li>Upload the saved file to this form</li>
        </ol>
      </div>`;
  }

  overlay.innerHTML = `
    <div class="nr-resume-header">
      <span>📄 NextRole — Tailored Resume</span>
      <button class="nr-resume-close">×</button>
    </div>
    <div class="nr-resume-body">${bodyHtml}</div>
  `;

  overlay.querySelector(".nr-resume-close")?.addEventListener("click", removeResumeOverlay);
  overlay.querySelector(".nr-retry")?.addEventListener("click", () => { removeResumeOverlay(); anchor._nrTailorResume?.(); });

  document.body.appendChild(overlay);
  activeResumeOverlay = overlay;
  return overlay;
}

function escapeHtml(str) {
  return (str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ─── Core: tailor + open ────────────────────────────���────────────────────────

async function tailorAndOpen(anchor) {
  const token = await getToken();
  if (!token) {
    showResumeOverlay({ anchor, state: "error", error: "Not signed in — open the NextRole extension and log in.", coverage: 0, jobTitle: "", company: "" });
    return;
  }

  const lastJob = await getLastJob();
  const pageCtx = getPageJobContext();

  const payload = {
    job_id:          lastJob.jobId || null,
    job_title:       lastJob.jobTitle || pageCtx.jobTitle,
    company:         lastJob.company  || pageCtx.company,
    job_description: pageCtx.jobDescription,
  };

  showResumeOverlay({ anchor, state: "loading", error: null, coverage: 0, jobTitle: payload.job_title, company: payload.company });

  chrome.runtime.sendMessage(
    { type: "TAILOR_RESUME", token, payload },
    (response) => {
      if (chrome.runtime.lastError || !response) {
        showResumeOverlay({ anchor, state: "error", error: "Extension error — try reloading the page.", coverage: 0, jobTitle: payload.job_title, company: payload.company });
        return;
      }

      if (!response.ok) {
        showResumeOverlay({ anchor, state: "error", error: response.error ?? "Unknown error", coverage: 0, jobTitle: payload.job_title, company: payload.company });
        return;
      }

      // Store the HTML for the "Open + Save PDF" button
      const { html, coverage, job_title, company } = response;

      showResumeOverlay({ anchor, state: "done", error: null, coverage, jobTitle: job_title, company });

      const overlay = activeResumeOverlay;
      overlay?.querySelector(".nr-open-pdf")?.addEventListener("click", () => {
        openResumeBlob(html);
      });
      overlay?.querySelector(".nr-view-dash")?.addEventListener("click", () => {
        if (response.resume_id) {
          chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/resumes` });
        }
      });
    }
  );
}

// ─── Attach to file inputs ────────────────────────────────���───────────────────

const RESUME_OBSERVED = new WeakSet();

function attachToFileInput(el) {
  if (RESUME_OBSERVED.has(el)) return;

  // Only target file inputs that accept resume-like formats
  const accept = (el.getAttribute("accept") ?? "").toLowerCase();
  const isPdfInput = !accept || accept.includes("pdf") || accept.includes("doc") || accept.includes("*");
  if (!isPdfInput) return;

  RESUME_OBSERVED.add(el);

  // Create the button
  const btn = document.createElement("button");
  btn.className = "nr-resume-btn";
  btn.type = "button";
  btn.innerHTML = `📄 Tailor resume`;

  // Insert after the file input
  el.insertAdjacentElement("afterend", btn);

  // Store reference for retry
  el._nrTailorResume = () => tailorAndOpen(btn);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    injectResumeStyles();
    tailorAndOpen(btn);
  });
}

function scanFileInputs() {
  document.querySelectorAll("input[type='file']").forEach(attachToFileInput);
}

// ─── Boot ────────────────────────────��──────────────────────���─────────────────

injectResumeStyles();
scanFileInputs();

// Watch for dynamically rendered file inputs (SPAs)
const resumeObserver = new MutationObserver(() => scanFileInputs());
resumeObserver.observe(document.body, { childList: true, subtree: true });

// Close overlay on outside click
document.addEventListener("mousedown", (e) => {
  if (activeResumeOverlay && !activeResumeOverlay.contains(e.target)) {
    removeResumeOverlay();
  }
}, true);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") removeResumeOverlay();
}, true);

})();
