/**
 * NextRole extension popup script — session-based auth via Supabase login
 */

// ─── State machine ────────────────────────────────────────────────────────────

const STATES = ["login", "loading", "job", "submitting", "success", "no-job", "error"];

function show(stateName) {
  for (const s of STATES) {
    const el = document.getElementById(`state-${s}`);
    if (el) el.classList.toggle("hidden", s !== stateName);
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

function getSession() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
      if (chrome.runtime.lastError) { resolve({ ok: false, loggedIn: false }); return; }
      resolve(res ?? { ok: false, loggedIn: false });
    });
  });
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const displayTitle   = $("display-title");
const displayCompany = $("display-company");
const displayUrl     = $("display-url");
const jdPreview      = $("jd-preview");
const confDot        = $("confidence-dot");
const confText       = $("confidence-text");
const successName    = $("success-job-name");
const errorMsg       = $("error-message");
const submittingText = $("submitting-text");
const btnMarkApplied = $("btn-mark-applied");

let currentJob   = null;
let currentJobId = null;

// ─── Confidence display ───────────────────────────────────────────────────────

const SOURCE_LABELS = {
  "schema.org":    "Structured data",
  linkedin:        "LinkedIn",
  indeed:          "Indeed",
  glassdoor:       "Glassdoor",
  lever:           "Lever",
  greenhouse:      "Greenhouse",
  ashby:           "Ashby",
  workday:         "Workday",
  smartrecruiters: "SmartRecruiters",
  workable:        "Workable",
  wellfound:       "Wellfound",
  naukri:          "Naukri",
  heuristic:       "Auto-detected",
};

function showJob(job) {
  confDot.className = `dot dot-${job.confidence === "high" ? "high" : job.confidence === "medium" ? "med" : "low"}`;
  confText.textContent = `Detected via ${SOURCE_LABELS[job.source] ?? job.source}`;

  displayTitle.textContent   = job.title   || "—";
  displayCompany.textContent = job.company || "—";

  try {
    const u = new URL(job.url);
    displayUrl.textContent = u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? u.pathname.slice(0, 40) : "");
  } catch {
    displayUrl.textContent = job.url?.slice(0, 50) ?? "";
  }

  if (job.description) {
    jdPreview.textContent = job.description.slice(0, 180).trim() + (job.description.length > 180 ? "…" : "");
    jdPreview.style.display = "block";
  } else {
    jdPreview.style.display = "none";
  }
}

// ─── API calls via background ─────────────────────────────────────────────────

function submitJob(jobPayload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SUBMIT_JOB", job: jobPayload },
      (response) => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (response.ok) resolve(response);
        else reject(new Error(response.error ?? "Unknown error"));
      }
    );
  });
}

function updateStatus(jobId, status) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "UPDATE_JOB_STATUS", jobId, status },
      (response) => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (response.ok) resolve(response);
        else reject(new Error(response.error ?? "Unknown error"));
      }
    );
  });
}

// ─── Login form ───────────────────────────────────────────────────────────────

$("link-signup").href = NEXTROLE_URL + "/signup";

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email    = $("login-email").value.trim();
  const password = $("login-password").value;
  const errEl    = $("login-error");
  const btn      = $("btn-login");

  errEl.classList.add("hidden");
  errEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Signing in…";

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "LOGIN", email, password }, (r) => {
      if (chrome.runtime.lastError) { resolve({ ok: false, error: "Extension error" }); return; }
      resolve(r ?? { ok: false, error: "No response" });
    });
  });

  if (res.ok) {
    init();
  } else {
    errEl.textContent = res.error ?? "Login failed. Check your credentials.";
    errEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  show("loading");
  currentJob   = null;
  currentJobId = null;
  resetAppliedButton();

  const session = await getSession();
  if (!session.loggedIn) { show("login"); return; }

  let job = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB" });
      job = response?.job ?? null;
    }
  } catch {}

  if (job) {
    currentJob = job;
    showJob(job);
    show("job");
  } else {
    show("no-job");
  }
}

// ─── Save job ─────────────────────────────────────────────────────────────────

async function saveJob(label) {
  if (!currentJob) return;

  submittingText.textContent = label;
  show("submitting");

  const res = await submitJob({
    title:       currentJob.title,
    company:     currentJob.company,
    url:         currentJob.url,
    description: currentJob.description,
    source:      "extension",
  });

  currentJobId = res.job_id ?? null;

  if (currentJobId) {
    chrome.storage.session.set({
      nr_last_job_id:    currentJobId,
      nr_last_job_title: currentJob.title  ?? "",
      nr_last_company:   currentJob.company ?? "",
    });
  }
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleEvaluate() {
  try {
    await saveJob("Saving & opening evaluation…");
    if (currentJobId) {
      chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/pipeline?job=${currentJobId}&action=evaluate` });
    }
    successName.textContent = `${currentJob.title} at ${currentJob.company}`;
    show("success");
  } catch (err) {
    errorMsg.textContent = err.message;
    show("error");
  }
}

async function handlePipeline() {
  try {
    await saveJob("Adding to pipeline…");
    successName.textContent = `${currentJob.title} at ${currentJob.company}`;
    show("success");
  } catch (err) {
    errorMsg.textContent = err.message;
    show("error");
  }
}

async function handleResume() {
  try {
    await saveJob("Saving & opening resume builder…");
    if (currentJobId) {
      chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/resume?job=${currentJobId}` });
    }
    successName.textContent = `${currentJob.title} at ${currentJob.company}`;
    show("success");
  } catch (err) {
    errorMsg.textContent = err.message;
    show("error");
  }
}

// ─── Mark as Applied ──────────────────────────────────────────────────────────

function resetAppliedButton() {
  btnMarkApplied.disabled = false;
  btnMarkApplied.classList.remove("applied-done");
  btnMarkApplied.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    Mark as Applied
  `;
}

async function handleMarkApplied() {
  if (!currentJobId || btnMarkApplied.disabled) return;
  btnMarkApplied.disabled = true;
  btnMarkApplied.innerHTML = "Saving…";
  try {
    await updateStatus(currentJobId, "applied");
    btnMarkApplied.innerHTML = "✓ Marked as Applied";
    btnMarkApplied.classList.add("applied-done");
  } catch {
    btnMarkApplied.disabled = false;
    resetAppliedButton();
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

$("btn-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("btn-go-options-err").addEventListener("click", () => chrome.runtime.openOptionsPage());

$("btn-evaluate").addEventListener("click", handleEvaluate);
$("btn-pipeline").addEventListener("click", handlePipeline);
$("btn-resume").addEventListener("click",   handleResume);

$("btn-mark-applied").addEventListener("click", handleMarkApplied);
$("btn-open-nextrole").addEventListener("click", () => {
  chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/pipeline` });
});
$("btn-add-another").addEventListener("click", () => init());
$("btn-retry").addEventListener("click",      () => init());
$("btn-open-nextrole-nojob").addEventListener("click", () => {
  chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/pipeline` });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();
