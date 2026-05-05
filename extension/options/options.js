const $ = (id) => document.getElementById(id);

$("server-url-display").textContent  = NEXTROLE_URL;
$("server-url-display-2").textContent = NEXTROLE_URL;
$("link-signup").href = NEXTROLE_URL + "/signup";

function showSection(name) {
  $("section-loading").style.display = name === "loading" ? "" : "none";
  $("section-login").classList.toggle("hidden", name !== "login");
  $("section-account").classList.toggle("hidden", name !== "account");
}

function setStatus(elId, type, msg) {
  const el = $(elId);
  el.className = `status ${type}`;
  el.textContent = msg;
}
function clearStatus(elId) {
  const el = $(elId);
  el.className = "status";
  el.textContent = "";
}

// ─── Boot: check session ──────────────────────────────────────────────────────

showSection("loading");

chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
  if (chrome.runtime.lastError || !res) { showSection("login"); return; }
  if (res.loggedIn && res.email) {
    $("account-email").textContent = res.email;
    showSection("account");
  } else {
    showSection("login");
  }
});

// ─── Sign in ──────────────────────────────────────────────────────────────────

$("btn-sign-in").addEventListener("click", async () => {
  const email    = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email || !password) {
    setStatus("login-status", "err", "Email and password are required.");
    return;
  }

  clearStatus("login-status");
  $("btn-sign-in").disabled = true;
  $("btn-sign-in").textContent = "Signing in…";

  chrome.runtime.sendMessage({ type: "LOGIN", email, password }, (res) => {
    $("btn-sign-in").disabled = false;
    $("btn-sign-in").textContent = "Sign in";

    if (chrome.runtime.lastError || !res) {
      setStatus("login-status", "err", "Extension error — try again.");
      return;
    }
    if (res.ok) {
      $("account-email").textContent = res.email ?? email;
      showSection("account");
    } else {
      setStatus("login-status", "err", res.error ?? "Login failed. Check your credentials.");
    }
  });
});

// ─── Sign out ─────────────────────────────────────────────────────────────────

$("btn-logout").addEventListener("click", () => {
  $("btn-logout").disabled = true;
  $("btn-logout").textContent = "Signing out…";

  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    $("login-email").value    = "";
    $("login-password").value = "";
    clearStatus("logout-status");
    showSection("login");
    $("btn-logout").disabled = false;
    $("btn-logout").textContent = "Sign out";
  });
});

// ─── Open dashboard ───────────────────────────────────────────────────────────

$("btn-open-dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: NEXTROLE_URL + "/dashboard" });
});
