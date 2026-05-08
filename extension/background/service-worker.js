/**
 * NextRole extension — background service worker
 * Auth: opaque token obtained via "Connect Extension" web flow.
 * Token stored in chrome.storage.local as "nr_ext_token".
 */
importScripts("../config.js");

// ─── Badge + action management ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "JOB_DETECTED" && sender.tab?.id) {
    const tabId = sender.tab.id;
    if (msg.found) {
      chrome.action.setBadgeText({ text: "✓", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#c84a1f", tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Clear badge only when a real navigation starts (url change), not on bfcache restores.
  if (changeInfo.status === "loading" && changeInfo.url) {
    chrome.action.setBadgeText({ text: "", tabId });
  }
});

// ─── Token storage helpers ────────────────────────────────────────────────────

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("nr_ext_token", (d) => resolve(d.nr_ext_token ?? null));
  });
}

function saveToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ nr_ext_token: token }, resolve);
  });
}

function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove("nr_ext_token", resolve);
  });
}

// ─── CONNECT_EXTENSION ────────────────────────────────────────────────────────
// Opens chrome.identity.launchWebAuthFlow → user logs in on nextrole.live →
// callback URL carries ?token=nrt_<hex> → we save it.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "CONNECT_EXTENSION") return false;

  (async () => {
    try {
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl = new URL(NEXTROLE_URL.replace(/\/$/, "") + "/connect-extension");
      authUrl.searchParams.set("redirect_to", redirectUrl);

      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl.toString(), interactive: true },
          (url) => {
            if (chrome.runtime.lastError || !url) {
              reject(new Error(chrome.runtime.lastError?.message ?? "Cancelled"));
            } else {
              resolve(url);
            }
          },
        );
      });

      const token = new URL(responseUrl).searchParams.get("token");
      if (!token || !token.startsWith("nrt_")) {
        throw new Error("No valid token received");
      }

      await saveToken(token);

      // Validate the token actually works before reporting success
      const testRes = await fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/token", {
        credentials: "omit",
        headers: { "Authorization": `Bearer ${token}` },
      }).catch(() => null);

      if (!testRes || !testRes.ok) {
        await clearToken();
        const status = testRes?.status ?? 0;
        throw new Error(
          status === 401 ? "Token was not saved — please try again" :
          status === 429 ? "Too many requests — please wait and try again" :
          "Connection failed — please try again",
        );
      }

      sendResponse({ ok: true });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();

  return true;
});

// ─── DISCONNECT ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "DISCONNECT") return false;
  clearToken().then(() => sendResponse({ ok: true }));
  return true;
});

// ─── GET_SESSION ──────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_SESSION") return false;

  getToken().then((token) => {
    if (token) {
      sendResponse({ ok: true, loggedIn: true, token });
    } else {
      sendResponse({ ok: false, loggedIn: false });
    }
  });

  return true;
});

// ─── Submit job ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "SUBMIT_JOB") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/job", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(msg.job),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          sendResponse({ ok: true, job_id: data.job_id });
        } else {
          const errMsg =
            res.status === 401 ? "Session expired — please reconnect the extension." :
            res.status === 402 ? "No credits remaining — check your NextRole plan." :
            res.status === 403 ? "Job limit reached — upgrade your plan." :
            data.error ?? `Server error (${res.status})`;
          sendResponse({ ok: false, error: errMsg });
        }
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Fetch profile for auto-fill ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_PROFILE") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/profile", {
      credentials: "omit",
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) sendResponse({ ok: true, profile: data });
        else sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Open tab ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "OPEN_TAB") return false;
  chrome.tabs.create({ url: msg.url });
});

// ─── Fill suggestion ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "FILL_SUGGEST") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/suggest", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(msg.payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          sendResponse({ ok: true, suggestion: data.suggestion });
        } else if (res.status === 402) {
          sendResponse({ ok: false, error: data.error ?? "Plan upgrade required.", upgrade: true });
        } else {
          sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
        }
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Tailor resume ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "TAILOR_RESUME") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/resume", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(msg.payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          sendResponse({ ok: true, resume_id: data.resume_id, html: data.html, coverage: data.coverage, job_title: data.job_title, company: data.company });
        } else if (res.status === 402) {
          sendResponse({ ok: false, error: data.error ?? "Plan upgrade required.", upgrade: true });
        } else {
          sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
        }
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Evaluate job ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "EVALUATE_JOB") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/evaluate", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ job_id: msg.jobId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          sendResponse({ ok: true, evaluation_id: data.evaluation_id, score: data.score, decision: data.decision, blocks: data.blocks });
        } else if (res.status === 402 || res.status === 403) {
          sendResponse({ ok: false, error: data.error ?? "Plan upgrade required.", upgrade: true });
        } else {
          sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
        }
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Update job status ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "UPDATE_JOB_STATUS") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(NEXTROLE_URL.replace(/\/$/, "") + `/api/extension/job/${msg.jobId}`, {
      method: "PATCH",
      credentials: "omit",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: msg.status }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) sendResponse({ ok: true });
        else sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});
