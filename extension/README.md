# NextRole Browser Extension

Chrome (MV3) extension that detects job postings, evaluates them against the user's profile, and **auto-fills the application form** end-to-end across the 20 most common job-posting sites. Better than Simplify is the goal.

---

## 1. Architecture (read this first)

```
┌──────────────────────────────── extension/ ───────────────────────────────┐
│                                                                            │
│  manifest.json ── MV3 config (permissions, content-script matches)        │
│                                                                            │
│  config.js ───── NEXTROLE_URL constant (the webapp it talks to)           │
│                                                                            │
│  background/                                                               │
│   service-worker.js ── ALL network calls. Holds the auth token.           │
│                        Every fetch to NextRole webapp goes through here.  │
│                        Message-router: GET_PROFILE, TAILOR_FILL,          │
│                        LIST_EVALUATIONS, GET_PROFILE_FILE, ADD_JOB, ...   │
│                                                                            │
│  content/                                                                  │
│   content.js ─────── Page-scrape: detect a job posting on the current     │
│                      page (JSON-LD, per-ATS selectors, heuristics).       │
│                      Posts to background → badge "1" → user clicks icon.  │
│                                                                            │
│   apply-card.js ──── The orange floating "NEXTROLE • APPLY" panel.        │
│                      One file = entire UI. Detects which ATS we're on     │
│                      and renders the matching helper:                     │
│                          renderWorkdayHelper(), renderGreenhouseHelper(), │
│                          renderLeverHelper(), renderAshbyHelper(),        │
│                          renderFaangHelper(), renderSimpleHelper() ...    │
│                      Buttons in the panel dispatch CustomEvents that      │
│                      auto-fill.js listens for.                            │
│                                                                            │
│   auto-fill.js ───── The ACTUAL form-filling code. One big module per    │
│                      ATS, listening for nr:<ats>-fill events:             │
│                          nr:workday-fill, nr:greenhouse-fill,             │
│                          nr:lever-fill, nr:ashby-fill, nr:faang-fill,     │
│                          nr:gforms-fill, nr:msforms-fill,                 │
│                          nr:linkedin-fill, nr:indeed-fill, nr:scan-req    │
│                      Receives profile + tailored answers in event.detail. │
│                                                                            │
│   resume-upload.js ─ Captures resume drops on certain ATSs.               │
│                                                                            │
│  popup/ ──────────── Click-the-icon UI (job detection + Add to Pipeline). │
│  options/ ────────── Token & NextRole URL configuration.                  │
│  icons/ ──────────── Toolbar/store icons.                                 │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

Data flow (apply-card autofill):

  User on Workday page
        │
        ▼
  apply-card.js renders the floating panel
        │ asks service-worker.js for GET_PROFILE + LIST_EVALUATIONS
        ▼
  service-worker.js calls /api/extension/profile on NextRole webapp
        │ returns { full_name, phone, work_experience[], education[], EEO, ... }
        ▼
  User clicks "Fill Form" (or autopilot)
        │
        ▼
  apply-card.js dispatches CustomEvent  nr:workday-fill  with profile + tailor data
        │
        ▼
  auto-fill.js handles the event, walks the DOM, writes every field,
  uploads resume file, returns count of filled/skipped fields
        │
        ▼
  apply-card.js shows result; in autopilot it clicks "Save and Continue" and loops
```

### Key concepts to understand before touching anything

1. **Native-setter trick.** React forms ignore plain `el.value = "x"`. We must use:
   ```js
   const proto = Object.getPrototypeOf(el);
   Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
   el.dispatchEvent(new Event("input", { bubbles: true }));
   ```
   Helper: `_angularFillInput(el, value)` in `auto-fill.js`. ALWAYS use it; never assign directly.

2. **CustomEvent bridge.** `apply-card.js` and `auto-fill.js` run in the same content-script world but are different files. They communicate via `document.dispatchEvent(new CustomEvent("nr:foo-fill", { detail: {...} }))`. Service worker is a separate world — only reachable via `chrome.runtime.sendMessage`.

3. **Per-ATS dedicated filler.** Each ATS has its own filler function (`_fillWorkdaySection`, `_fillLeverForm`, etc.) because every ATS has different selectors and component patterns. **Do NOT write a generic regex matcher and call it done.** That's how Simplify fails.

4. **Profile shape.** Single source of truth is `/api/extension/profile` response. See `app/api/extension/profile/route.ts` in the webapp for the full schema. Memorize these field names — they are what every filler references.

5. **Autopilot loop.** For Workday and the other multi-section ATSs, the panel fills the current section → clicks Save & Continue → waits for the next section to load → fills again → stops at Review. Code: `runWorkdayAutopilot()` and `runGenericMultiStepAutopilot()` in `apply-card.js`.

6. **Submit safety.** **Never click Submit automatically.** The autopilot must always stop at Review and wait for the user. `_wdFindNextButton` explicitly refuses any button whose text is "Submit".

---

## 2. The 20 target sites (FROZEN — do not add more)

We are **capping at 20 sites** for the ship. Anything beyond this list is post-launch.

### ATS platforms (10)

| # | Site | URL pattern | Owner | Status |
|---|------|-------------|-------|--------|
| 1 | **Workday** | `*.myworkdayjobs.com` | Saksham | ✅ verified (Walmart) |
| 2 | **Greenhouse** | `boards.greenhouse.io`, `job-boards.greenhouse.io` | Intern A | 🟡 needs verification |
| 3 | **Lever** | `jobs.lever.co` | Intern A | 🟡 needs verification |
| 4 | **Ashby** | `jobs.ashbyhq.com` | Intern A | 🟡 needs verification |
| 5 | **SmartRecruiters** | `jobs.smartrecruiters.com` | Intern B | ❌ to build |
| 6 | **iCIMS** | `*.icims.com` | Intern B | ❌ to build |
| 7 | **Oracle HCM Cloud** | `*.oraclecloud.com/hcmUI` | Saksham | 🟡 needs verification |
| 8 | **SAP SuccessFactors** | `*.successfactors.com` | Intern B | ❌ to build |
| 9 | **Taleo** | `*.taleo.net` | Intern B | ❌ to build |
| 10 | **Avature** | `*.avature.net` | Intern B | ❌ to build |

### Major company career pages (5)

| # | Site | URL pattern | Owner | Status |
|---|------|-------------|-------|--------|
| 11 | **Amazon Jobs** | `amazon.jobs` | Saksham | 🟡 needs verification |
| 12 | **Google Careers** | `careers.google.com` | Saksham | 🟡 needs verification |
| 13 | **Meta Careers** | `metacareers.com` | Intern A | 🟡 needs verification |
| 14 | **Apple Jobs** | `jobs.apple.com` | Intern A | 🟡 needs verification |
| 15 | **Microsoft Careers** | `careers.microsoft.com` | Intern A | 🟡 needs verification |

### Generic / other (5)

| # | Site | URL pattern | Owner | Status |
|---|------|-------------|-------|--------|
| 16 | **LinkedIn Easy Apply** | `linkedin.com/jobs/*` modal | Intern A | 🟡 needs verification |
| 17 | **Indeed Apply** | `smartapply.indeed.com` | Intern A | 🟡 needs verification |
| 18 | **Google Forms** | `docs.google.com/forms` | Saksham | 🟡 needs verification |
| 19 | **Microsoft Forms** | `forms.office.com`, `forms.microsoft.com` | Saksham | 🟡 needs verification |
| 20 | **Naukri** | `naukri.com` (Indian market) | Intern B | 🟡 needs verification |

**Status legend:** ✅ verified on real form · 🟡 code exists, needs real-DOM testing · ❌ not built yet

---

## 3. Wednesday ship plan (today is Monday)

**Goal:** every site in the table above flips from 🟡/❌ to ✅ by EOD Wednesday.

### Definition of "verified" (the bar for ✅)

For each site, the verifier records a 60-second screen capture showing:
1. Open the apply page → orange panel appears
2. Click "Fill Form" (or "Autopilot" for Workday/etc.) → ≥90% of visible fields are filled correctly
3. Resume file is attached (where the form has an upload input)
4. For multi-step forms: autopilot continues to the next page; STOPS at Review
5. No console errors

If <90% fields fill: open a ticket with the failing DOM snippet (right-click → Inspect → copy outerHTML of the problem field) and tag it in `/extension/INSPECT-BUNDLES/<site>/`.

### Monday (today, May 11) — Setup + claim

| Time | Who | Task |
|------|-----|------|
| Now → 5pm | All 3 | Read this README end to end. Then read in order: `manifest.json`, `background/service-worker.js`, `content/apply-card.js`, `content/auto-fill.js`. Don't write code yet — just read and ask questions. |
| 5 → 7pm | All 3 | Each person loads the extension locally (Section 5 below), signs into NextRole, opens a real job posting on their assigned ATS, and confirms the orange panel appears. **No fixes yet.** |
| 7 → 9pm | All 3 | For each assigned site, capture the apply page DOM: right-click the form root → "Copy outerHTML" → paste into `extension/INSPECT-BUNDLES/<site>/page1.html`. Do this for every step of a multi-step form. |

### Tuesday (May 12) — Build + fix

| Slot | Who | Task |
|------|-----|------|
| AM | Intern B | Build the 4 missing fillers: SmartRecruiters, iCIMS, Taleo, Avature. Copy the structure of `_fillLeverForm` in `auto-fill.js`. SAP SuccessFactors goes in PM. |
| AM | Intern A | Run verification on the 5 sites assigned to you. File a ticket with DOM snippet for any field that fails. |
| AM | Saksham | Run verification on Workday/Oracle HCM/Google/MS Forms/Amazon/Google Careers. Patch the new `_fillWorkdaySection("Application Questions")` handler with whatever shows up. |
| PM | Intern B | Build SAP SuccessFactors filler. Test the 5 you built. |
| PM | Intern A | Fix the failing fields from your AM tickets. |
| PM | Saksham | Code-review every PR. Add the missing 5 sites' ATS detection to `apply-card.js` (`detectSite()`). |
| EOD | All | Stand-up call. Every site's status row is updated. |

### Wednesday (May 13) — Verify + package

| Slot | Task |
|------|------|
| AM | Each person re-runs verification on their 5 sites with a clean Chrome profile. Recording goes in `extension/PROOFS/<site>.mp4`. |
| Noon | Saksham bumps `manifest.json` version to `1.0.0` → `1.0.0` (or `1.1.0` if breaking), regenerates icons, makes a `.zip` of the `extension/` folder. |
| PM | Submit to Chrome Web Store (Saksham). |
| EOD | 🎉 |

### Hard rules (do not break)

- ❌ **Do not add a 21st site.** Anything not on the list above is post-launch.
- ❌ **Do not auto-click Submit.** Autopilot stops at Review. Always.
- ❌ **Do not assign `el.value = x` directly.** Use `_angularFillInput(el, value)`.
- ❌ **Do not log PII.** No `console.log(profile)`. No phone/email in console.
- ❌ **Do not push directly to main.** Every PR needs review by Saksham.
- ✅ **Do** test on a real job posting (not Codepen mocks) before claiming ✅.
- ✅ **Do** capture inspect HTML when something doesn't work — that's how Saksham debugs without your machine.

---

## 4. How interns should approach the code

**Read in this order, set aside 2 hours:**

1. `extension/manifest.json` (15 lines — what permissions we have, which scripts inject where)
2. `extension/background/service-worker.js` (~600 lines — every API call. Skim the `chrome.runtime.onMessage.addListener` blocks — each one is a message type)
3. `extension/content/content.js` (job detection — only relevant if you're touching the orange "Add to Pipeline" popup, not autofill)
4. `extension/content/apply-card.js` (~3000 lines — UI. Find your ATS via Ctrl+F: `renderLeverHelper`, `renderAshbyHelper`, etc.)
5. `extension/content/auto-fill.js` (~3500 lines — actual fillers. Find your ATS: `_fillLeverForm`, `_fillAshbyForm`, etc.)

**Pattern for adding a new ATS filler:**

```js
// 1. In apply-card.js — add detection:
function detectSite() {
  if (/jobs\.smartrecruiters\.com/.test(location.host)) return "smartrecruiters";
  // ...
}

// 2. In apply-card.js — add a renderer (copy renderLeverHelper as template):
async function renderSmartRecruitersHelper(container, jobId, job) {
  return renderSimpleHelper({
    container, jobId, job,
    ats: "smartrecruiters",
    accent: "#5e9eff",
    requestFill: requestSmartRecruitersFill,
  });
}
function requestSmartRecruitersFill(detail) {
  document.dispatchEvent(new CustomEvent("nr:smartrecruiters-fill", { detail }));
}

// 3. In auto-fill.js — add the actual filler:
async function _fillSmartRecruitersForm(profile, resumeBlob, tailorData) {
  const result = { filled: 0, skipped: 0, errors: [] };
  // ... actual fill logic using selectors from your INSPECT-BUNDLES/smartrecruiters/page1.html
  return result;
}

document.addEventListener("nr:smartrecruiters-fill", async (e) => {
  const { resumeData, tailorData } = e.detail ?? {};
  const resumeBlob = _blobFromData(resumeData);
  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};
  const results = await _fillSmartRecruitersForm(profile, resumeBlob, tailorData);
  document.dispatchEvent(new CustomEvent("nr:fill-result", { detail: results }));
});

// 4. Also add the host to AF_ATS in auto-fill.js so the filler is allowed to run.
```

**Debugging checklist when fill silently fails:**

1. Open DevTools → Console. Look for `[NextRole]` lines.
2. Console → run `chrome.runtime.sendMessage({type:"GET_PROFILE"}, console.log)` and confirm profile loads.
3. Inspect the field that didn't fill → does the label match what your filler's regex expects? Adjust the regex.
4. Is it React? Did you use `_angularFillInput`? (Plain `.value =` will not work.)
5. Is it inside a Shadow DOM? Use `_ojFillByLabel` (Oracle HCM) or the Shadow root pattern.
6. Is it inside an iframe? `all_frames: false` in `manifest.json` means we don't reach iframes — flag this to Saksham.

---

## 5. Local dev setup

### One-time setup (each developer)

1. Clone the repo: `git clone <repo>`
2. Install Node 20+ and PNPM.
3. From the repo root: `pnpm install`
4. Copy `.env.local.example` → `.env.local` (ask Saksham for the values).
5. Run the webapp: `pnpm dev` (serves at `http://localhost:3000`)
6. In another terminal: confirm the webapp is reachable at `http://localhost:3000`.

### Load the extension into Chrome

1. Open `chrome://extensions`
2. Toggle **Developer mode** ON (top-right)
3. Click **Load unpacked** → pick the `extension/` folder
4. Pin the extension to the toolbar.
5. Right-click the extension icon → **Options** → set:
   - **NextRole URL:** `http://localhost:3000`
   - **Token:** generated from the webapp under Settings → Browser Extension Token

### After editing extension code

1. Edit the file.
2. `chrome://extensions` → click the **↻ reload** icon on the NextRole row.
3. Refresh the job-application tab.
4. Test.

---

## 6. File map (cheat sheet)

```
extension/
├─ manifest.json                 MV3 config — host permissions, content scripts
├─ config.js                     NEXTROLE_URL constant
├─ background/
│   └─ service-worker.js         All fetches. Message router.
├─ content/
│   ├─ content.js                Job detection / scrape (popup-driven, not autofill)
│   ├─ apply-card.js             Orange floating panel UI + autopilot loops
│   ├─ auto-fill.js              Per-ATS form fillers
│   └─ resume-upload.js          Resume capture for site-specific upload widgets
├─ popup/                        Toolbar-icon UI
├─ options/                      Token + URL settings UI
├─ icons/                        Toolbar/store icons
├─ INSPECT-BUNDLES/              ← NEW: per-site DOM samples (intern outputs)
│   ├─ workday/page1.html
│   ├─ greenhouse/page1.html
│   └─ ...
└─ PROOFS/                       ← NEW: per-site verification recordings (Wed)
```

---

## 7. Glossary

| Term | Meaning |
|------|---------|
| **ATS** | Applicant Tracking System (Workday, Greenhouse, etc.) |
| **Autopilot** | The mode where the extension fills *every* page of a multi-step form until Review |
| **Tailor** | AI-generated answers for freeform questions (cover letter, why-company), scoped to one application |
| **Apply card** | The orange floating panel injected on apply pages (rendered by `apply-card.js`) |
| **Profile** | The user's saved data in the NextRole webapp (`/dashboard/profile`) — single source of truth for all autofill |
| **MV3** | Chrome Manifest V3 — the extension API version we target |

---

## 8. Who to ask

- **Saksham** (lead) — anything architectural, anything Workday/Oracle/Google, code review, ship decisions
- **Intern A** — Lever / Ashby / Greenhouse / LinkedIn / Indeed / Meta / Apple / Microsoft
- **Intern B** — SmartRecruiters / iCIMS / Taleo / Avature / SAP SF / Naukri

Daily check-ins at **10am, 3pm, 7pm IST** until Wednesday EOD.
