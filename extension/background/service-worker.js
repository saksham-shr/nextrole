/**
 * NextRole extension — background service worker
 * Auth: Supabase email/password login → JWT stored in chrome.storage.local
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
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ text: "", tabId });
  }
});

// ─── Session storage helpers ──────────────────────────────────────────────────

function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["nr_access_token", "nr_refresh_token", "nr_expires_at", "nr_user_email"], (d) => {
      resolve({
        accessToken:  d.nr_access_token  ?? null,
        refreshToken: d.nr_refresh_token ?? null,
        expiresAt:    d.nr_expires_at    ?? 0,
        email:        d.nr_user_email    ?? null,
      });
    });
  });
}

function saveSession({ access_token, refresh_token, expires_in, user }) {
  const expiresAt = Date.now() + (expires_in ?? 3600) * 1000 - 30_000; // 30s buffer
  return new Promise((resolve) => {
    chrome.storage.local.set({
      nr_access_token:  access_token,
      nr_refresh_token: refresh_token,
      nr_expires_at:    expiresAt,
      nr_user_email:    user?.email ?? null,
    }, resolve);
  });
}

function clearSession() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(
      ["nr_access_token", "nr_refresh_token", "nr_expires_at", "nr_user_email"],
      resolve,
    );
  });
}

async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  await saveSession(data);
  return data.access_token ?? null;
}

async function getValidToken() {
  const session = await getSession();
  if (!session.accessToken) return null;
  if (Date.now() < session.expiresAt) return session.accessToken;
  if (session.refreshToken) return refreshSession(session.refreshToken);
  return null;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "LOGIN") return false;

  const { email, password } = msg;

  fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        sendResponse({ ok: false, error: data.error_description ?? data.msg ?? "Login failed" });
        return;
      }
      await saveSession(data);
      sendResponse({ ok: true, email: data.user?.email ?? email });
    })
    .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));

  return true;
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "LOGOUT") return false;

  getSession().then(async (session) => {
    if (session.accessToken) {
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.accessToken}`,
          "apikey": SUPABASE_ANON_KEY,
        },
      }).catch(() => {});
    }
    await clearSession();
    sendResponse({ ok: true });
  });

  return true;
});

// ─── GET_SESSION ──────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_SESSION") return false;

  getSession().then(async (session) => {
    if (!session.accessToken) { sendResponse({ ok: false, loggedIn: false }); return; }
    const token = await getValidToken();
    if (!token) { await clearSession(); sendResponse({ ok: false, loggedIn: false }); return; }
    sendResponse({ ok: true, loggedIn: true, token, email: session.email });
  });

  return true;
});

// ─── Submit job ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "SUBMIT_JOB") return false;

  getValidToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not logged in" }); return; }

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
            res.status === 401 ? "Session expired — please log in again." :
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

  getValidToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not logged in" }); return; }

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

  getValidToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not logged in" }); return; }

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

  getValidToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not logged in" }); return; }

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

// ─── Update job status ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "UPDATE_JOB_STATUS") return false;

  getValidToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not logged in" }); return; }

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
