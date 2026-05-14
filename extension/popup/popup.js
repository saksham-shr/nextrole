/**
 * NextRole extension popup — token-based auth via "Connect Extension" web flow.
 */

// ─── State machine ────────────────────────────────────────────────────────────

const STATES = ["login", "loading", "job", "submitting", "success", "no-job", "error"];

function show(stateName) {
  for (const s of STATES) {
    const el  = document.getElementById(`state-${s}`);
    const acts = document.getElementById(`state-${s}-actions`);
    if (el) el.classList.toggle("hidden", s !== stateName);
    if (acts) acts.classList.toggle("hidden", s !== stateName);
  }
  const footer = document.getElementById("popup-footer");
  if (footer) footer.style.display = stateName === "loading" || stateName === "submitting" ? "none" : "";
}

// ─── Session ──────────────────────────────────────────────────────────────────

function getSession() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, loggedIn: false });
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
const successTitle   = $("success-title");
const successMark    = $("success-company-mark");
const successStatus  = $("success-status");
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
  oracle:          "Oracle Recruiting",
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
  confText.textContent = `DETECTED VIA ${(SOURCE_LABELS[job.source] ?? job.source ?? "").toUpperCase()}`;

  displayTitle.textContent   = job.title   || "—";
  displayCompany.textContent = job.company || "—";

  // Company mark: first letter of company, fallback to N
  const mark = document.getElementById("company-mark");
  if (mark) mark.textContent = (job.company?.[0] ?? "N").toUpperCase();

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

  // Ribbon — populated by showAlreadySaved/markAsApplied flows (clear by default)
  const ribbon = document.getElementById("job-ribbon");
  if (ribbon) { ribbon.innerHTML = ""; ribbon.classList.add("hidden"); }
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
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-save-apply"), $("btn-resume")].forEach((b) => {
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

function checkJobUrl(url) {
  return new Promise((resolve) => {
    if (!url) { resolve({ ok: false, exists: false }); return; }
    chrome.runtime.sendMessage({ type: "CHECK_JOB_URL", url }, (response) => {
      if (chrome.runtime.lastError) { resolve({ ok: false, exists: false }); return; }
      resolve(response ?? { ok: false, exists: false });
    });
  });
}

function fetchJobArtifacts(jobId) {
  return new Promise((resolve) => {
    if (!jobId) { resolve(null); return; }
    chrome.runtime.sendMessage({ type: "GET_JOB_ARTIFACTS", jobId }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) { resolve(null); return; }
      resolve(response);
    });
  });
}

function setApplicationSession(tabId, session) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SET_APPLICATION_SESSION", tabId, session },
      (response) => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (response?.ok) resolve(response.session ?? null);
        else reject(new Error(response?.error ?? "Unknown error"));
      }
    );
  });
}

function relativeSavedLabel(dateString) {
  if (!dateString) return "Already saved";
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days === 0) return "Already saved today";
  if (days === 1) return "Already saved yesterday";
  return `Already saved ${days} days ago`;
}

async function hydratePipelineStatus(job) {
  const ribbon = document.getElementById("job-ribbon");
  if (!ribbon || !job?.url) return;

  const existing = await checkJobUrl(job.url);
  if (!existing?.exists || !existing.job_id) {
    ribbon.innerHTML = "";
    ribbon.classList.add("hidden");
    return;
  }

  currentJobId = existing.job_id;
  const artifacts = await fetchJobArtifacts(existing.job_id);
  const savedLabel = relativeSavedLabel(artifacts?.job?.created_at);
  const evalScore = artifacts?.evaluation?.score;
  const evalDecision = artifacts?.evaluation?.decision ?? "apply";
  const evalLabel = typeof evalScore === "number"
    ? ` &nbsp;·&nbsp; ★ ${evalScore.toFixed(1)} · ${evalDecision}`
    : "";

  ribbon.innerHTML = `${savedLabel}${evalLabel}`;
  ribbon.classList.remove("hidden");
}

// ????????? Connect button ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

$("link-signup").href = NEXTROLE_URL + "/signup";

$("btn-connect").addEventListener("click", async () => {
  const btn = $("btn-connect");
  const errEl = $("login-error");
  errEl.textContent = "";
  errEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Connecting...";

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

// ????????? Init ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

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
    [$("btn-evaluate"), $("btn-pipeline"), $("btn-save-apply"), $("btn-resume")].forEach((b) => {
      if (b) b.disabled = false;
    });
    hydratePipelineStatus(job).catch(() => {});
  } else {
    show("no-job");
  }
}

// ????????? Save job ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

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
      nr_last_job_url:   currentJob.url ?? "",
      nr_last_job_title: currentJob.title ?? "",
      nr_last_company:   currentJob.company ?? "",
    });
  }

  return {
    jobId,
    created: res.created === true,
    existing: res.existing === true,
    canonicalUrl: res.canonical_url ?? null,
    atsFamily: res.ats_family ?? null,
  };
}

// ????????? Action handlers ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

function populateSuccessCard(message) {
  if (successTitle) successTitle.textContent = currentJob?.title ?? "";
  if (successName)  successName.textContent  = currentJob?.company ?? "";
  if (successMark)  successMark.textContent  = (currentJob?.company?.[0] ?? "N").toUpperCase();
  if (successStatus && message) successStatus.textContent = message;
}

async function handleEvaluate() {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-save-apply"), $("btn-resume")].forEach((b) => { if (b) b.disabled = true; });
  try {
    const saved = await saveJob("Saving and opening evaluation...");
    if (saved.jobId) {
      chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/pipeline?job=${saved.jobId}&action=evaluate` });
    }
    populateSuccessCard("Saved and opening evaluation in NextRole...");
    show("success");
  } catch (err) {
    showJobError(err.message);
  }
}

async function handlePipeline() {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-save-apply"), $("btn-resume")].forEach((b) => { if (b) b.disabled = true; });
  try {
    await saveJob("Saving for later...");
    populateSuccessCard("Saved to your pipeline.");
    show("success");
  } catch (err) {
    showJobError(err.message);
  }
}

async function handleSaveAndApply() {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-save-apply"), $("btn-resume")].forEach((b) => { if (b) b.disabled = true; });
  try {
    const saved = await saveJob("Saving and preparing apply flow...");

    const sessionPayload = {
      job_id:         saved.jobId ?? null,
      jobTitle:       currentJob?.title ?? "",
      company:        currentJob?.company ?? "",
      jobDescription: currentJob?.description ?? "",
      source_url:     currentJob?.url ?? "",
      target_url:     null,
      canonical_url:  saved.canonicalUrl ?? null,
      ats_family:     saved.atsFamily ?? null,
      status:         "intent",
      savedAt:        Date.now(),
    };

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await setApplicationSession(tab.id, sessionPayload);
        chrome.tabs.sendMessage(tab.id, {
          type: "OPEN_APPLY_CARD",
          payload: {
            jobId: saved.jobId,
            jobTitle:       sessionPayload.jobTitle,
            company:        sessionPayload.company,
            jobDescription: sessionPayload.jobDescription,
          },
        }, () => { /* ignore lastError: tab may not have content script */ });
      }
    } catch { /* tabs API may not be available; session state is enough */ }

    populateSuccessCard("Saved. Click Apply on this page and we'll auto-open the fill card.");
    show("success");
  } catch (err) {
    showJobError(err.message);
  }
}

async function handleResume() {
  [$("btn-evaluate"), $("btn-pipeline"), $("btn-save-apply"), $("btn-resume")].forEach((b) => { if (b) b.disabled = true; });
  try {
    const saved = await saveJob("Saving and opening resume builder...");
    if (saved.jobId) {
      chrome.tabs.create({ url: `${NEXTROLE_URL}/dashboard/resumes?job=${saved.jobId}` });
    }
    populateSuccessCard("Saved and opening resume builder in NextRole...");
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
$("btn-save-apply").addEventListener("click", handleSaveAndApply);
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

