function getField(id) {
  return document.getElementById(id);
}

function setStatus(text, kind) {
  const el = getField("status");
  el.textContent = text;
  el.className = `muted ${kind || ""}`;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function normalizeBaseUrl(url) {
  const raw = (url || "").trim().replace(/\/$/, "");
  return raw || "https://nextrole.live";
}

async function loadSavedBaseUrl() {
  const result = await chrome.storage.sync.get(["nextroleBaseUrl"]);
  return result.nextroleBaseUrl || "https://nextrole.live";
}

async function saveBaseUrl(value) {
  await chrome.storage.sync.set({ nextroleBaseUrl: value });
}

async function parseFromPage() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const response = await chrome.tabs.sendMessage(tab.id, { type: "NEXTROLE_PARSE_JOB" }).catch(() => null);
  if (!response?.ok) {
    setStatus("Could not parse this page automatically. Fill fields manually.", "err");
    return;
  }

  getField("title").value = response.job.title || "";
  getField("company").value = response.job.company || "";
  getField("url").value = response.job.url || tab.url || "";
  getField("description").value = response.job.description || "";
}

async function sendToPipeline() {
  const baseUrl = normalizeBaseUrl(getField("baseUrl").value);
  await saveBaseUrl(baseUrl);

  const job = {
    title: getField("title").value.trim(),
    company: getField("company").value.trim(),
    url: getField("url").value.trim(),
    description: getField("description").value.trim(),
    source: "chrome_extension",
  };

  if (!job.title || !job.company || !job.description) {
    setStatus("Title, company, and description are required.", "err");
    return;
  }

  setStatus("Sending to pipeline...", "");

  try {
    const res = await fetch(`${baseUrl}/api/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        job,
        steps: ["evaluate", "status_update"],
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setStatus(`Failed (${res.status}): ${body.error || "Unknown error"}`, "err");
      return;
    }

    setStatus("Job captured and pipeline started.", "ok");
  } catch (error) {
    setStatus(`Request failed: ${error?.message || "Unknown error"}`, "err");
  }
}

(async () => {
  getField("baseUrl").value = await loadSavedBaseUrl();
  await parseFromPage();
  getField("send").addEventListener("click", sendToPipeline);
})();
