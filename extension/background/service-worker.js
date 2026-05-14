/**
 * NextRole extension — background service worker
 * Auth: opaque token obtained via "Connect Extension" web flow.
 * Token stored in chrome.storage.local as "nr_ext_token".
 */
importScripts("../config.js");

// ─── Response shape validators ────────────────────────────────────────────────
// Lightweight checks that ensure API responses match expected shapes before
// we cache or pass them to content scripts. No external libraries — just
// structural assertions.

function isNonNullObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function validateProfile(data) {
  if (!isNonNullObject(data)) return "profile response is not an object";
  // Must have at least an email or full_name — any valid profile has one of these
  if (typeof data.email !== "string" && typeof data.full_name !== "string") {
    return "profile missing required fields (email / full_name)";
  }
  return null; // valid
}

function validateCvStructure(data) {
  if (!isNonNullObject(data)) return "cv-structure response is not an object";
  return null;
}

function validateJobArtifacts(data) {
  // May be an object or null (no artifacts yet) — reject only non-objects that aren't null
  if (data !== null && !isNonNullObject(data)) return "job-artifacts response has unexpected shape";
  return null;
}

function validateEvaluation(data) {
  if (!isNonNullObject(data)) return "evaluation response is not an object";
  return null;
}

function validateResume(data) {
  if (!isNonNullObject(data)) return "resume response is not an object";
  return null;
}

// ─── Grant content scripts access to chrome.storage.session ───────────────────
// By default storage.session is gated to extension contexts only. Content
// scripts (apply-card.js, content.js) need it for per-tab tailor state and
// cross-site job carry-over, so widen the access level on startup.
try {
  chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });
} catch (e) {
  console.warn("[NextRole] storage.session.setAccessLevel failed", e);
}

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

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabSession(tabId).catch(() => {});
});

chrome.tabs.onCreated.addListener((tab) => {
  const openerTabId = tab.openerTabId;
  if (openerTabId == null || tab.id == null) return;

  (async () => {
    const openerSession = await getTabSession(openerTabId);
    const isFreshIntent = openerSession?.status === "intent" &&
      (Date.now() - (openerSession.savedAt ?? 0)) <= 90 * 60 * 1000;
    if (!isFreshIntent) return;

    const copied = await setTabSession(tab.id, {
      ...openerSession,
      source_tab_id: tab.id,
      opened_from_tab_id: openerTabId,
      target_url: tab.pendingUrl ?? tab.url ?? openerSession.target_url ?? null,
      status: "intent",
    });
    const token = await getToken();
    const remote = await syncApplicationSession(token, copied);
    if (remote?.id) {
      await setTabSession(tab.id, { ...copied, remote_session_id: remote.id });
    }
  })().catch(() => {});
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

const RESPONSE_CACHE = new Map();
const INFLIGHT_REQUESTS = new Map();

function getCachedValue(key, ttlMs) {
  const entry = RESPONSE_CACHE.get(key);
  if (!entry) return null;
  if ((Date.now() - entry.savedAt) > ttlMs) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedValue(key, value) {
  RESPONSE_CACHE.set(key, { value, savedAt: Date.now() });
  return value;
}

function invalidateCache(prefix) {
  for (const key of RESPONSE_CACHE.keys()) {
    if (key.startsWith(prefix)) RESPONSE_CACHE.delete(key);
  }
}

async function withInflight(key, factory) {
  if (INFLIGHT_REQUESTS.has(key)) return INFLIGHT_REQUESTS.get(key);
  const promise = Promise.resolve().then(factory).finally(() => {
    INFLIGHT_REQUESTS.delete(key);
  });
  INFLIGHT_REQUESTS.set(key, promise);
  return promise;
}

function appSessionKey(tabId) {
  return `nr_app_session_${tabId}`;
}

function getTabSession(tabId) {
  return new Promise((resolve) => {
    if (tabId == null) {
      resolve(null);
      return;
    }
    chrome.storage.session.get(appSessionKey(tabId), (data) => {
      resolve(data?.[appSessionKey(tabId)] ?? null);
    });
  });
}

function setTabSession(tabId, session) {
  return new Promise((resolve) => {
    if (tabId == null) {
      resolve(null);
      return;
    }
    const next = {
      ...session,
      source_tab_id: session?.source_tab_id ?? tabId,
      last_seen_at: new Date().toISOString(),
    };
    chrome.storage.session.set({ [appSessionKey(tabId)]: next }, () => resolve(next));
  });
}

function clearTabSession(tabId) {
  return new Promise((resolve) => {
    if (tabId == null) {
      resolve();
      return;
    }
    chrome.storage.session.remove(appSessionKey(tabId), () => resolve());
  });
}

async function syncApplicationSession(token, session) {
  if (!token || !session) return null;
  const res = await fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/application-session", {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      session_id: session.remote_session_id ?? null,
      job_id: session.job_id ?? session.jobId ?? null,
      source_tab_id: session.source_tab_id ?? null,
      source_url: session.source_url ?? session.sourceUrl ?? null,
      target_url: session.target_url ?? session.targetUrl ?? null,
      ats_family: session.ats_family ?? session.atsFamily ?? null,
      status: session.status ?? "intent",
      fill_started_at: session.fill_started_at ?? null,
      submitted_at: session.submitted_at ?? null,
      failure_reason: session.failure_reason ?? null,
    }),
  }).catch(() => null);

  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.session ?? null;
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
        let apiError = "";
        try { apiError = (await testRes?.json())?.error ?? ""; } catch {}
        throw new Error(
          status === 429 ? "Too many requests — please wait and try again" :
          apiError ? `Server error (${status}): ${apiError}` :
          !testRes ? "Network error — could not reach nextrole.live" :
          `Server error (${status}) — please try again`,
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
          invalidateCache("job-artifacts:");
          if (msg.job?.url) invalidateCache(`job-url:${msg.job.url}`);
          sendResponse({
            ok: true,
            job_id: data.job_id,
            created: data.created === true,
            existing: data.existing === true,
            canonical_url: data.canonical_url ?? null,
            ats_family: data.ats_family ?? null,
          });
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "GET_APPLICATION_SESSION") return false;

  const tabId = msg.tabId ?? sender.tab?.id ?? null;
  getTabSession(tabId).then((session) => sendResponse({ ok: true, session }));
  return true;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "CLEAR_APPLICATION_SESSION") return false;

  const tabId = msg.tabId ?? sender.tab?.id ?? null;
  clearTabSession(tabId).then(() => sendResponse({ ok: true }));
  return true;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "SET_APPLICATION_SESSION") return false;

  const tabId = msg.tabId ?? sender.tab?.id ?? null;

  (async () => {
    const current = await getTabSession(tabId);
    const merged = {
      ...(current ?? {}),
      ...(msg.session ?? {}),
      source_tab_id: tabId,
      savedAt: msg.session?.savedAt ?? current?.savedAt ?? Date.now(),
    };
    const saved = await setTabSession(tabId, merged);
    const token = await getToken();
    const remote = await syncApplicationSession(token, saved);
    const finalSession = remote ? { ...saved, remote_session_id: remote.id } : saved;
    await setTabSession(tabId, finalSession);
    sendResponse({ ok: true, session: finalSession });
  })().catch((err) => sendResponse({ ok: false, error: err.message }));

  return true;
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_PROFILE") return false;

  getToken().then(async (token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    const cacheKey = `profile:${token}`;
    const cached = getCachedValue(cacheKey, 30_000);
    if (cached) {
      sendResponse(cached);
      return;
    }

    try {
      const payload = await withInflight(cacheKey, async () => {
        const res = await fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/profile", {
          credentials: "omit",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error ?? `Server error (${res.status})` };
        const shapeError = validateProfile(data);
        if (shapeError) return { ok: false, error: `Invalid profile data: ${shapeError}` };
        return setCachedValue(cacheKey, { ok: true, profile: data });
      });
      sendResponse(payload);
    } catch (err) {
      sendResponse({ ok: false, error: `Network error: ${err.message}` });
    }
  });

  return true;
});

// ─── Fetch structured CV data for Workday modal auto-fill ────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_CV_STRUCTURE") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/cv-structure", {
      credentials: "omit",
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` }); return; }
        const shapeError = validateCvStructure(data);
        if (shapeError) { sendResponse({ ok: false, error: `Invalid CV data: ${shapeError}` }); return; }
        sendResponse({ ok: true, structure: data });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Check if job URL already in pipeline ────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "CHECK_JOB_URL") return false;

  getToken().then(async (token) => {
    if (!token) { sendResponse({ ok: false, exists: false }); return; }

    const cacheKey = `job-url:${msg.url}`;
    const cached = getCachedValue(cacheKey, 60_000);
    if (cached) {
      sendResponse(cached);
      return;
    }

    try {
      const payload = await withInflight(cacheKey, async () => {
        const res = await fetch(NEXTROLE_URL.replace(/\/$/, "") + `/api/extension/job?url=${encodeURIComponent(msg.url)}`, {
          credentials: "omit",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        return res.ok
          ? setCachedValue(cacheKey, { ok: true, ...data })
          : { ok: false, exists: false };
      });
      sendResponse(payload);
    } catch {
      sendResponse({ ok: false, exists: false });
    }
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

  (async () => {
    const token = await getToken();
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    let res, data;
    try {
      res  = await fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/suggest", {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(msg.payload ?? {}),
      });
      data = await res.json().catch(() => ({}));
    } catch (err) {
      sendResponse({ ok: false, error: `Network error: ${err.message}` });
      return;
    }

    if (res.ok) {
      sendResponse({ ok: true, suggestion: data.suggestion });
    } else if (res.status === 402) {
      sendResponse({ ok: false, error: data.error ?? "Plan upgrade required.", upgrade: true });
    } else {
      sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
    }
  })();

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
        if (!res.ok) {
          if (res.status === 402) return sendResponse({ ok: false, error: data.error ?? "Plan upgrade required.", upgrade: true });
          return sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
        }
        const shapeError = validateResume(data);
        if (shapeError) return sendResponse({ ok: false, error: `Invalid data: ${shapeError}` });
        sendResponse({ ok: true, resume_id: data.resume_id, html: data.html, coverage: data.coverage, job_title: data.job_title, company: data.company });
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
        if (!res.ok) {
          if (res.status === 402 || res.status === 403) return sendResponse({ ok: false, error: data.error ?? "Plan upgrade required.", upgrade: true });
          return sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
        }
        const shapeError = validateEvaluation(data);
        if (shapeError) return sendResponse({ ok: false, error: `Invalid data: ${shapeError}` });
        sendResponse({ ok: true, evaluation_id: data.evaluation_id, score: data.score, decision: data.decision, archetype: data.archetype ?? null, blocks: data.blocks });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Fetch job artifacts for apply-card (recent jobs, evaluation, resume) ────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_JOB_ARTIFACTS") return false;

  getToken().then(async (token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    const cacheKey = `job-artifacts:${msg.jobId ?? "none"}`;
    const cached = getCachedValue(cacheKey, 10_000);
    if (cached) {
      sendResponse(cached);
      return;
    }

    const params = new URLSearchParams();
    if (msg.jobId) params.set("jobId", msg.jobId);
    const qs = params.toString();

    try {
      const payload = await withInflight(cacheKey, async () => {
        const res = await fetch(NEXTROLE_URL.replace(/\/$/, "") + `/api/extension/job-artifacts${qs ? `?${qs}` : ""}`, {
          credentials: "omit",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error ?? `Server error (${res.status})` };
        const shapeError = validateJobArtifacts(data);
        if (shapeError) return { ok: false, error: `Invalid artifacts data: ${shapeError}` };
        return setCachedValue(cacheKey, { ok: true, ...data });
      });
      sendResponse(payload);
    } catch (err) {
      sendResponse({ ok: false, error: `Network error: ${err.message}` });
    }
  });

  return true;
});

// ─── Report feedback (not-a-job / confirmed) ──────────────────────────────────
// Fire-and-forget: no sendResponse needed — extension doesn't wait for this.
// Token is optional; anonymous reports are accepted by the API.

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "REPORT_FEEDBACK") return false;

  getToken().then((token) => {
    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/feedback", {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(msg.payload ?? {}),
    }).catch(() => {}); // silently swallow — feedback is best-effort
  });

  return false; // no async sendResponse
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
        if (res.ok) {
          invalidateCache("job-artifacts:");
          sendResponse({ ok: true });
        }
        else sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── AI tailoring: single-call multi-field job-aware answer generation ──────
//
// Request: { jobId?, evaluationId?, jobTitle?, company?, jobDescription?,
//            fieldsNeeded: string[] }
// Response: { ok, answers, experience_bullets, skills_to_emphasize,
//             tailor_sessions_today, credits_remaining }

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "TAILOR_FILL") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    const payload = {
      job_id:         msg.jobId         ?? null,
      evaluation_id:  msg.evaluationId  ?? null,
      jobTitle:       msg.jobTitle      ?? "",
      company:        msg.company       ?? "",
      jobDescription: msg.jobDescription ?? "",
      fields_needed:  Array.isArray(msg.fieldsNeeded) ? msg.fieldsNeeded : [],
    };

    fetch(NEXTROLE_URL.replace(/\/$/, "") + "/api/extension/tailor", {
      method: "POST",
      credentials: "omit",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) sendResponse({ ok: true, ...data });
        else sendResponse({
          ok: false,
          error: data.error ?? `Server error (${res.status})`,
          cap_reached: data.cap_reached === true,
          insufficient_credits: data.insufficient_credits === true,
          upgrade: data.upgrade === true,
        });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── List recent evaluations (for apply-card evaluation picker) ──────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "LIST_EVALUATIONS") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    const qs = msg.url ? `?url=${encodeURIComponent(msg.url)}` : "";
    fetch(NEXTROLE_URL.replace(/\/$/, "") + `/api/extension/evaluations${qs}`, {
      credentials: "omit",
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) sendResponse({ ok: true, ...data });
        else sendResponse({ ok: false, error: data.error ?? `Server error (${res.status})` });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true;
});

// ─── Get user's uploaded profile file (resume or cover letter) ──────────────
//
// kind: "resume" | "cover_letter"
// id?:  specific file id; if omitted, returns the default (or most recent)
//
// Returns: { ok, data: number[], type, filename }

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_PROFILE_FILE") return false;

  const kind = msg.kind === "cover_letter" ? "cover_letter" : "resume";
  const idQs = msg.id ? `&id=${encodeURIComponent(msg.id)}` : "";

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(
      NEXTROLE_URL.replace(/\/$/, "") +
        `/api/extension/profile-file?kind=${encodeURIComponent(kind)}${idQs}`,
      { credentials: "omit", headers: { "Authorization": `Bearer ${token}` } },
    )
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          sendResponse({ ok: false, error: d.error ?? `Server error (${res.status})` });
          return;
        }
        const ab       = await res.arrayBuffer();
        const filename = res.headers.get("X-File-Name") ?? `nextrole_${kind}`;
        const type     = res.headers.get("Content-Type") ?? "application/octet-stream";
        sendResponse({
          ok:       true,
          data:     Array.from(new Uint8Array(ab)),
          type,
          filename,
        });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true; // async sendResponse
});

// ─── Get resume file as binary (for Accenture direct upload) ─────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "GET_RESUME_FILE") return false;

  getToken().then((token) => {
    if (!token) { sendResponse({ ok: false, error: "Not connected" }); return; }

    fetch(
      NEXTROLE_URL.replace(/\/$/, "") +
        `/api/extension/resume-file?jobId=${encodeURIComponent(msg.jobId ?? "")}${msg.format ? `&format=${encodeURIComponent(msg.format)}` : ""}`,
      { credentials: "omit", headers: { "Authorization": `Bearer ${token}` } },
    )
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          sendResponse({ ok: false, error: d.error ?? `Server error (${res.status})` });
          return;
        }
        const ab = await res.arrayBuffer();
        const type = res.headers.get("Content-Type") ?? "application/pdf";
        const filename = res.headers.get("X-File-Name") ?? "nextrole_resume.pdf";
        // Convert to plain Array so it survives the structured-clone boundary
        sendResponse({
          ok:       true,
          data:     Array.from(new Uint8Array(ab)),
          type,
          filename,
        });
      })
      .catch((err) => sendResponse({ ok: false, error: `Network error: ${err.message}` }));
  });

  return true; // async sendResponse
});
