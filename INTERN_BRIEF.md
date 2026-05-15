# NextRole — Intern Engineering Brief
**Version 1.1 — May 2026**

---

## 0. Before You Touch Anything: Read These Files

The codebase already has working ATS support. Do **not** reinvent what exists. Read these in order:

| File | Why |
|---|---|
| `extension/registry/ats.js` | The canonical registry format. Every deliverable you produce must slot into this file. |
| `extension/content/auto-fill.js` | The form-filler. Workday is the reference implementation — read `_fillWorkdaySection()` line by line. |
| `extension/content/apply-card.js` | The UI panel. Shows how each ATS gets its own `render*Helper()` and dispatches `CustomEvent` to auto-fill. |
| `extension/content/content.js` | Job detection. Shows how JSON-LD, per-ATS selectors, and heuristics are layered. |
| `extension/README.md` | Extension architecture and the 20-site target list with current verification status. |

**Workday is already verified** (`walmart.wd5`, `nvidia.wd5`). Do not spend time on it. Your job is to verify and complete the 12 families currently marked `verified: []`.

---

## 1. Platforms You Are Targeting

### Status Key
- ✅ Code + DOM verified on a real form
- 🟡 Code exists, DOM selectors **unverified** — your primary focus
- ❌ Not yet built

| # | Platform | Family (`ats.js` key) | Status | Notes |
|---|---|---|---|---|
| 1 | Workday | `workday` | ✅ Done | Skip |
| 2 | Greenhouse | `greenhouse` | 🟡 Verify | `boards.greenhouse.io`, `job-boards.greenhouse.io` |
| 3 | Lever | `lever` | 🟡 Verify | `jobs.lever.co` |
| 4 | Ashby | `ashby` | 🟡 Verify | `jobs.ashbyhq.com` |
| 5 | SAP SuccessFactors | `successfactors` | 🟡 Verify | EY Careers also runs on this |
| 6 | Oracle HCM Cloud | `oracle` | 🟡 Verify | Shadow DOM — high priority risk |
| 7 | Amazon Jobs | `amazon` | 🟡 Verify | `amazon.jobs`, `hiring.amazon.com` |
| 8 | Meta Careers | `meta` | 🟡 Verify | `metacareers.com` |
| 9 | Naukri | `naukri` | 🟡 Verify | Chatbot-style Q&A flow |
| 10 | LinkedIn Easy Apply | `linkedin` | 🟡 Verify | In-modal multi-step |
| 11 | Indeed Apply | `indeed` | 🟡 Verify | `apply.indeed.com` |
| 12 | Instahyre / Hirist | ❌ Not built | — | Indian aggregators |
| 13 | Wellfound (AngelList) | ❌ Not built | — | `wellfound.com` |
| 14 | iCIMS | ❌ Not built | — | `icims.com` |
| 15 | SmartRecruiters | ❌ Not built | — | `jobs.smartrecruiters.com` |
| 16 | Deloitte | ❌ Not built | — | Runs on custom SuccessFactors |
| 17 | Google Careers | `gforms` | 🟡 Verify | Often redirects to custom ATS |
| 18 | Zomato / Swiggy | ❌ Not built | — | Direct career pages |
| 19 | Microsoft | `workday` | ✅ via Workday | `jobs.careers.microsoft.com` |
| 20 | Infosys | `infosys` | 🟡 Verify | `career.infosys.com` |

---

## Group 1: Detection & Context Tracking (2 Interns)

**Goal:** Ensure the extension never loses the job's context across redirects. When a user clicks "Apply" on Naukri and lands on a Workday portal, the extension must already know the job title, company, and JD.

### How Detection Currently Works (Understand This First)

`content.js` has three extraction layers — they run in priority order:

```
1. JSON-LD (schema.org/JobPosting) — most reliable, works on any site
2. Per-ATS DOM selectors (LinkedIn, Indeed, Lever, Greenhouse...)
3. Heuristic fallbacks (company from domain, title from <h1>)
```

Job data is sent to the service worker via:
```js
chrome.runtime.sendMessage({ type: "JOB_DETECTED", job: { title, company, description, url, confidence } });
```

The service worker stores it in `chrome.storage.local` keyed by `tabId`. When the user lands on the application form (different tab or redirect), `apply-card.js` retrieves it with:
```js
chrome.runtime.sendMessage({ type: "GET_TAB_JOB", tabId: sender.tab.id }, (job) => { ... });
```

### Your Tasks

**Task 1 — Redirect Chain Mapping**

For each aggregator platform (Naukri, LinkedIn, Hirist, Instahyre, Wellfound), document the full redirect chain when a user clicks "Apply":

```
Naukri JD page
  → clicks "Apply" button
  → [Naukri internal redirect? Direct link? iFrame?]
  → Landing page URL
  → Does URL contain a job ID that matches the original posting?
```

Deliverable: a `redirectChains.json` file per platform:
```json
{
  "platform": "Naukri",
  "jdUrlPattern": "naukri.com/job-listings-*",
  "applyButtonSelector": ".apply-button, [data-ga-track='apply_button']",
  "redirectBehavior": "external_url | same_tab | new_tab | iframe",
  "destinationAtsFamily": "workday | greenhouse | lever | custom",
  "jobIdPreservation": {
    "preserved": true,
    "mechanism": "URL param: ?jobId=12345 | referrer header | none",
    "extractionScript": "new URLSearchParams(location.search).get('jobId')"
  }
}
```

**Task 2 — JD Extraction Scripts**

For each aggregator, write an extraction function that mirrors the pattern already used in `content.js`. Use the `fromLinkedIn()` function as your template:

```js
// In content.js, find this existing function and study it:
function fromLinkedIn() { /* selector-based extraction */ }

// Your new function for Naukri should follow the same structure:
function fromNaukri() {
  const title   = texts('.jd-header-title, h1.title');  // use the texts() helper
  const company = texts('.jd-header-comp-name, .companyName');
  const desc    = texts('.job-desc, .jd-container');
  if (!title) return null;
  return { title, company, description: cleanText(desc, 4000), confidence: 0.8 };
}
```

`texts()` and `cleanText()` are already defined in `content.js` — use them, don't reinvent.

**Task 3 — State Machine Verification**

`apply-card.js` uses the registry's `jdPattern` and `applyPattern` regexes to decide which UI to render. For each 🟡 platform, verify that the regexes in `ats.js` correctly distinguish:

- Search results page → no panel rendered
- JD detail page → "Add to Pipeline" + Evaluate button shown
- Application form page → full autofill panel shown

Test with at least 3 real job URLs per platform. If a regex is wrong, update `ats.js` directly and add the tested URL to the `verified[]` array.

---

## Group 2: Site Mapping & DOM Extraction (2 Interns)

**Goal:** Build a verified `NR_ATS_REGISTRY` entry for every unverified platform. The registry in `extension/registry/ats.js` is the single source of truth — your job is to fill the gaps.

### The Registry Schema (This Is Your Deliverable Format)

Every entry you produce must follow this exact schema from `ats.js`. Workday is the gold standard:

```js
workday: {
  label:        "Workday",          // Display name
  family:       "workday",          // Must match the key
  framework:    "Workday fkit (React)", // JS framework the ATS uses
  hosts: [                          // Regex patterns to detect the ATS from window.location.host
    /myworkdayjobs\.com$/i,
  ],
  jdPattern:    /\/job\/[^/]+(?:\?|$|#)/,      // Regex on full URL → are we on a JD page?
  applyPattern: /\/(?:apply|applyFlow)(?:\/|$|\?)/, // Regex → are we on the apply page?
  formMarker:   '[data-automation-id="applyFlowPage"]', // CSS selector: form is present?
  submitMarker: '[data-automation-id="applyFlowCompletePage"]', // success page indicator
  multiStep:    true,               // Does the form have multiple pages?
  stepIndicator: '[data-automation-id="progressBarActiveStep"] label', // current step label
  fieldWrapper:  '[data-automation-id^="formField-"]', // wraps each input group
  fields: {
    firstName: 'input[name="legalName--firstName"]', // CSS selector or null
    lastName:  'input[name="legalName--lastName"]',
    email:     'input[name="email"]',
    phone:     'input[name="phoneNumber"]',
    linkedin:  'input[name="linkedInAccount"]',
    jobTitle:  '[data-fkit-id$="--jobTitle"] input',   // work experience
    schoolName:'[data-fkit-id$="--schoolName"] input', // education
  },
  fileUpload: {
    resume: 'input[data-automation-id="file-upload-input-ref"]',
    cover:  null,
  },
  nextButton: '[data-automation-id="pageFooterNextButton"]:not([aria-label*="Submit" i])',
  notes:    "Human-readable notes about quirks.",
  verified: ["walmart.wd5.myworkdayjobs.com"], // Add real URLs you tested on
},
```

### How to Inspect a Form Correctly

**Do not scrape text. Extract the raw HTML structure of the input elements.**

In Chrome DevTools, on each application form:

1. Open DevTools → Elements panel
2. Find the main `<form>` element (or the outermost container if no `<form>`)
3. Right-click → Copy → `Copy outerHTML`
4. Save this to `tools/dom-snapshots/<platform>-apply.html`
5. Look for these attributes on every `<input>`, `<select>`, `<textarea>`:
   - `id`, `name`, `data-*`, `aria-label`, `placeholder`, `autocomplete`

For React-based ATSs (Greenhouse, Lever, Ashby), the visible label text is often the most stable identifier. Cross-reference with the `DIRECT_MAP` regex patterns in `auto-fill.js`:

```js
// In auto-fill.js, study this existing map — your selectors must cover what these regexes detect:
const DIRECT_MAP = {
  full_name:  [/\bfull.?name\b/i],
  first_name: [/\bfirst.?name\b/i],
  last_name:  [/\blast.?name\b/i],
  email:      [/\bemail\b/i],
  phone:      [/\bphone\b|\bmobile\b/i],
  linkedin:   [/\blinkedin\b/i],
  // ...
};
```

### Platform-Specific Inspection Checklist

For each 🟡 platform, document answers to all of these:

**Basic Fields**
- [ ] What selector uniquely identifies `first_name`, `last_name`, `email`, `phone`?
- [ ] Is there a combined `full_name` field instead of split first/last?
- [ ] What is the resume file upload `<input type="file">` selector?
- [ ] Is LinkedIn URL a standard field or a custom question?

**Dropdown Handling**
- [ ] Are dropdowns `<select>` (simple) or react-select (`.select__control` — requires synthetic event)?
- [ ] For phone country code, what library is used (`intl-tel-input`, native `<select>`, custom)?

**Multi-step Forms**
- [ ] How many steps does the form have? (Navigate through a real application)
- [ ] What selector identifies "Next" / "Save & Continue"? Critically, what selector identifies "Submit"? (We must **never** click Submit.)
- [ ] Is each step a page navigation or a DOM swap?

**Custom Questions**
- [ ] How are "Why do you want to work here?" questions structured?
  - Greenhouse: `.custom-questions .field`, label contains the question text
  - Lever: `[data-field-id^="custom"]`
  - What does this platform use?
- [ ] How are D&I / EEO questions structured? Are they in a separate section?
- [ ] Document the container selector so the AI can target these for custom answer generation.

**Shadow DOM Check**
- Run this snippet in DevTools console on the form page:
  ```js
  document.querySelectorAll('*').length;
  // Then:
  Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot).map(el => el.tagName);
  ```
- If any elements have a `shadowRoot`, list them. Oracle HCM uses `oj-input-text` web components — these require the `_ojFillByLabel` pattern already in `auto-fill.js`.

**Login / Guest Apply**
- [ ] Can a user apply without creating an account ("Apply as Guest")?
- [ ] If login is required, document the URL and selector for the "Create Account" vs "Sign In" flow. The extension must detect this state and show a warning message instead of trying to fill a login form.

### Deliverable Format

For each platform, create a folder: `tools/dom-snapshots/<platform>/`

```
tools/dom-snapshots/greenhouse/
  ├── apply-page.html          # outerHTML of the form container
  ├── registry-entry.js        # copy-pasteable NR_ATS_REGISTRY entry
  ├── field-map.json           # structured field data (see below)
  └── notes.md                 # quirks, shadow DOM findings, login walls
```

`field-map.json` format:
```json
{
  "platform": "Greenhouse",
  "testedUrl": "https://job-boards.greenhouse.io/remotecom/jobs/6079674003",
  "fields": {
    "first_name":        "#first_name",
    "last_name":         "#last_name",
    "email":             "#email",
    "phone":             "input[type='tel']",
    "resume_upload":     "#resume",
    "cover_letter":      "#cover_letter",
    "linkedin":          null,
    "custom_questions":  ".custom-questions .field",
    "dei_section":       "#demographic-section",
    "submit_button":     "#submit_app"
  },
  "dropdownLibrary":     "react-select",
  "phoneLibrary":        "intl-tel-input",
  "multiStep":           false,
  "shadowDomElements":   [],
  "loginRequired":       false,
  "guestApplyUrl":       null,
  "notes":               "Single-page form. All dropdowns are react-select (.select__control). Phone uses intl-tel-input."
}
```

---

## Operational Instructions for All Interns

### 1. Repo Setup

```bash
git clone <repo-url>
cd nextrole
git checkout -b intern/<your-name>-dom-mapping
```

All deliverables go in `tools/dom-snapshots/`. Open a PR targeting `main` when done. One PR per platform.

### 2. How to Load the Extension Locally

```
Chrome → chrome://extensions → Enable Developer Mode → Load Unpacked → select extension/
```

Navigate to a real job posting on the target platform. Open DevTools → Console to see `[NR]`-prefixed log messages from the extension. These tell you exactly what the extension detected and which filler it selected.

### 3. The "Never Submit" Rule

The extension's autopilot stops at the **Review** step and never clicks the final Submit button. When documenting `nextButton`, you **must** include a negative selector that excludes Submit:

```js
// Correct — excludes Submit
nextButton: '[data-automation-id="pageFooterNextButton"]:not([aria-label*="Submit" i])',

// Wrong — would auto-submit
nextButton: '[data-automation-id="pageFooterNextButton"]',
```

Always verify your `nextButton` selector against the button that appears on the final review step. It must not match it.

### 4. React Form Filling (Critical)

Standard `element.value = "..."` does **not** work on React-controlled inputs. The extension already uses this pattern — your job is to verify the selectors work with it:

```js
// The native setter trick — already in auto-fill.js
const proto = Object.getPrototypeOf(el);
Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
el.dispatchEvent(new Event("input", { bubbles: true }));
el.dispatchEvent(new Event("change", { bubbles: true }));
```

Test your selectors manually in DevTools console:
```js
const el = document.querySelector('#first_name');
const proto = Object.getPrototypeOf(el);
Object.getOwnPropertyDescriptor(proto, "value").set.call(el, "Test");
el.dispatchEvent(new Event("input", { bubbles: true }));
// Does the form field update and validate correctly?
```

### 5. Edge Cases to Flag (Not to Fix)

You are **not** responsible for writing the filler code. You are responsible for documenting these cases so the developer can implement them:

| Edge Case | What to Document |
|---|---|
| Shadow DOM | List every element tag that has a `shadowRoot`. Provide the label text used to identify the field. |
| Multi-page form | Every step's URL pattern, the "Next" selector, the "Submit" selector (to exclude), and whether it's page nav vs. DOM swap. |
| Iframe-embedded form | Is the entire form inside an `<iframe>`? If so, provide the `iframe` `src` domain — content scripts need explicit `matches` entries for it. |
| CAPTCHA | Document at which step it appears. We cannot bypass it; the extension must pause and show a "Complete CAPTCHA manually" message. |
| File upload quirks | Some platforms use hidden `<input type="file">` triggered by a drag zone or button. Document the actual `<input>` selector, not the visible button. |

### 6. Privacy Reminder

When testing, use a throwaway resume with fake personal data. Never submit a real application. Stop the process before the final Submit page.

---

## Definition of Done

A platform is complete when:

1. `tools/dom-snapshots/<platform>/field-map.json` is committed with a real `testedUrl`
2. `tools/dom-snapshots/<platform>/registry-entry.js` contains a valid `NR_ATS_REGISTRY` entry
3. The entry has at least one URL in its `verified[]` array
4. A PR is open with a description noting any edge cases (Shadow DOM, login walls, CAPTCHA steps)
5. The developer has reviewed and merged the entry into `extension/registry/ats.js`

---

## Questions?

Ping in the team Slack channel. If you find a selector that works, commit it immediately — don't wait until you have the full platform done. Partial verified data is better than nothing.
