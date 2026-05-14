const $ = (id) => document.getElementById(id);

$("server-url-display").textContent = NEXTROLE_URL;

function showSection(name) {
  $("section-loading").style.display  = name === "loading"  ? "" : "none";
  $("section-connect").classList.toggle("hidden", name !== "connect");
  $("section-account").classList.toggle("hidden", name !== "account");
}

// ─── Boot: check session ──────────────────────────────────────────────────────

showSection("loading");

chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
  if (chrome.runtime.lastError || !res) { showSection("connect"); return; }
  if (res.loggedIn && res.email) {
    $("account-email").textContent = res.email;
    showSection("account");
  } else {
    showSection("connect");
  }
});

// ─── Open settings page ───────────────────────────────────────────────────────

$("btn-open-settings").addEventListener("click", () => {
  chrome.tabs.create({ url: NEXTROLE_URL + "/dashboard/settings" });
});

// ─── Open dashboard ───────────────────────────────────────────────────────────

$("btn-open-dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: NEXTROLE_URL + "/dashboard" });
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

$("btn-logout").addEventListener("click", () => {
  $("btn-logout").disabled = true;
  $("btn-logout").textContent = "Disconnecting…";

  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    showSection("connect");
    $("btn-logout").disabled = false;
    $("btn-logout").textContent = "Disconnect";
  });
});
