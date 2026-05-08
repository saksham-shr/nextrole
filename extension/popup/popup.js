/**
 * NextRole extension popup — token-based auth via "Connect Extension" web flow.
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
      if (chrome.runtime.lastError) {
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res2) => {
            if (chrome.runtime.lastError) { resolve({ ok: false, loggedIn: false }); return; }
            resolve(res2 ?? { ok: false, loggedIn: false });
          });
        }, 250);
        return;
      }
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
const jobErrorEl     = $("job-error");

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
  icims:           "iCIMS",
  bamboohr:        "BambooHR",
  taleo:           "Taleo",
  jazzhr:          "JazzHR",
  recruitee:       "Recruitee",
  breezyhr:        "Breezy HR",
  jobvite:         "Jobvite",
  teamtailor:      "Teamtailor",
  personio:        "Personio",
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

// ─── Inline error helpers ─────────────────────────────────────────────────────

function isSessionError(msg) {
  return ["Session expired", "Unauthorized", "Not connected", "Not logged in", "log in again", "reconnect"].some((s) => msg?.includes(s));
}

function friendlyError(msg) {
  if (!msg) return "Something went wrong. Please try again.";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Network error")) {
    return "Network error — please reload the extension at chrome://extensions and try again.";
  }
  if (isSessionError(msg)) {
    return "Your connection expired — please reconnect the extension.";
  }
  return msg;
}

function showJobError(msg) {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-resume")].forEach((b) => {
    if (b) b.disabled = false;
  });

  if (isSessionError(msg)) {
    jobErrorEl.innerHTML =
      `Connection expired — <button id="nr-reconnect-btn" style="color:var(--accent);background:none;border:none;cursor:pointer;font-size:11px;padding:0;text-decoration:underline;font-family:inherit;">reconnect</button>`;
    jobErrorEl.classList.remove("hidden");
    show("job");
    document.getElementById("nr-reconnect-btn")?.addEventListener("click", () => {
      clearJobError();
      currentJob = null;
      currentJobId = null;
      show("login");
    });
    return;
  }

  jobErrorEl.textContent = friendlyError(msg);
  jobErrorEl.classList.remove("hidden");
  show("job");
}

function clearJobError() {
  jobErrorEl.textContent = "";
  jobErrorEl.classList.add("hidden");
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

// ─── Connect button ───────────────────────────────────────────────────────────

$("link-signup").href = NEXTROLE_URL + "/signup";

$("btn-connect").addEventListener("click", async () => {
  const btn = $("btn-connect");
  const errEl = $("login-error");
  errEl.textContent = "";
  errEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Connecting…";

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "CONNECT_EXTENSION" }, (r) => {
      if (chrome.runtime.lastError) { resolve({ ok: false, error: "Extension error — try reloading." }); return; }
      resolve(r ?? { ok: false, error: "No response" });
    });
  });

  if (res.ok) {
    init();
  } else {
    errEl.textContent = res.error ?? "Connection failed. Please try again.";
    errEl.classList.remove("hidden");
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      Connect to NextRole`;
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  show("loading");
  currentJob   = null;
  currentJobId = null;
  resetAppliedButton();
  clearJobError();

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
    [$("btn-evaluate"), $("btn-pipeline"), $("btn-resume")].forEach((b) => {
      if (b) b.disabled = false;
    });
  } else {
    show("no-job");
  }
}

// ─── Save job ─────────────────────────────────────────────────────────────────

async function saveJob(label) {
  if (!currentJob) throw new Error("No job data available.");

  clearJobError();
  submittingText.textContent = label;
  show("submitting");

  const res = await submitJob({
    title:       currentJob.title,
    company:     currentJob.company,
    url:         currentJob.url,
    description: currentJob.description,
    source:      "extension",
  });

  const jobId = res.job_id ?? null;

  if (jobId) {
    currentJobId = jobId;
    chrome.storage.session.set({
      nr_last_job_id:    jobId,
      nr_last_job_title: currentJob.title  ?? "",
      nr_last_company:   currentJob.company ?? "",
    });
  }

  return jobId;
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleEvaluate() {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-resume")].forEach((b) => { if (b) b.disabled = true; });
  try {
    const jobId = await saveJob("Saving & opening evaluation…");
    if (jobId) {
      chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}&action=evaluate` });
    }
    successName.textContent = `${currentJob.title} at ${currentJob.company}`;
    show("success");
  } catch (err) {
    showJobError(err.message);
  }
}

async function handlePipeline() {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-resume")].forEach((b) => { if (b) b.disabled = true; });
  try {
    await saveJob("Adding to pipeline…");
    successName.textContent = `${currentJob.title} at ${currentJob.company}`;
    show("success");
  } catch (err) {
    showJobError(err.message);
  }
}

async function handleResume() {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-resume")].forEach((b) => { if (b) b.disabled = true; });
  try {
    const jobId = await saveJob("Saving & opening resume builder…");
    if (jobId) {
      chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/resume?job=${jobId}` });
    }
    successName.textContent = `${currentJob.title} at ${currentJob.company}`;
    show("success");
  } catch (err) {
    showJobError(err.message);
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
