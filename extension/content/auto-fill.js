/**
 * NextRole Auto-fill Assistant
 *
 * Runs on ATS / application pages. Classifies and fills form fields.
 *
 * In the new architecture this module no longer shows any UI — the FAB and
 * panel have been removed in favour of apply-card.js.  This module instead
 * responds to two CustomEvents dispatched by apply-card.js:
 *
 *   nr:scan-req  → scan all fillable fields; respond with nr:scan-res
 *   nr:write     → write caller-supplied values into the live form; respond with nr:write-done
 *
 * fill-assistant.js is no longer used and has been deleted.
 */

(function () {

// ─── Guard: ATS / application pages only ─────────────────────────────────────

const AF_ATS = [
  /boards\.greenhouse\.io/,
  /grnh\.se/,
  /jobs\.lever\.co/,
  /lever\.co\/apply/,
  /jobs\.ashbyhq\.com/,
  /myworkdayjobs\.com/,
  /smartrecruiters\.com/,
  /apply\.workable\.com/,
  /linkedin\.com\/jobs\/easy-apply/,
  /icims\.com/,
  /bamboohr\.com\/careers/,
  /jobs\.jobvite\.com/,
  /recruiting\.ultipro\.com/,
  /applytojob\.com/,
  /jazz\.co/,
  /\.recruitee\.com/,
  /\.breezy\.hr/,
  /jobs\.rippling\.com/,
  /\.freshteam\.com\/jobs/,
  /\.teamtailor\.com/,
  /jobs\.personio\./,
  /taleo\.net/,
  /oraclecloud\.com\/hcmUI/,
  /oracle\.com\/.*apply/,
  /fa\.[a-z0-9]+\.oraclecloud\.com/,
  /naukri\.com/,
  /indeed\.com\/apply/,
  /jobs\.workday\.com/,
  // SAP SuccessFactors
  /successfactors\.com/,
  /sapsf\.com/,
  /career\.sap\.com/,
  /jobs\.sap\.com/,
];

const isAfAts   = AF_ATS.some((p) => p.test(location.href));
const isAfApply = /apply|application/i.test(location.href) && !!document.querySelector("form");

if (!isAfAts && !isAfApply) return;

// ─── Field classification ─────────────────────────────────────────────────────

const DIRECT_MAP = {
  full_name:      [/\bfull.?name\b|\byour.?name\b/i],
  first_name:     [/\bfirst.?name\b|\bgiven.?name\b|\bforename\b/i],
  last_name:      [/\blast.?name\b|\bsurname\b|\bfamily.?name\b/i],
  email:          [/\bemail\b/i],
  phone:          [/\bphone\b|\bmobile\b|\btelephone\b|\bcell\b/i],
  linkedin:       [/\blinkedin\b/i],
  github:         [/\bgithub\b/i],
  website:        [/\bwebsite\b|\bportfolio\b|\bpersonal.?url\b/i],
  location:       [/\bcity\b|\blocation\b|\bwhere.*based\b|\bcountry\b/i],
  salary:         [/\bsalary\b|\bcompensation\b|\bexpected.?pay\b|\bdesired.?salary\b/i],
  // Address sub-fields — profile doesn't store these; getDirectValue returns "".
  // They are classified so the apply-card can show them in the field list.
  street_address: [/\baddress\b(?!.{0,20}(?:line\s*2|email|web|url|suite|apt))/i],
  address_line2:  [/address\s*(?:line\s*)?2\b|apt\.?\b|suite\b|unit\s*\#?(?:\s|$)/i],
  zip_postal:     [/\bzip\b|\bpostal\s*(?:code)?\b|\bpin\s*code\b|\bpostcode\b/i],
  state_province: [/\bstate\b(?!\s*(?:ment|d\b|ly\b))|\bprovince\b/i],
};

const AI_MAP = [
  { type: "cover_letter",   pattern: /cover.?letter|covering.?letter/i },
  { type: "why_company",    pattern: /why.*(company|role|position|us)|what.*excit|motivation|draw.*to/i },
  { type: "about_yourself", pattern: /tell.*about.*yourself|about.*you|introduce|introduction|summary|background/i },
  { type: "experience",     pattern: /relevant.*experience|work.*experience|describe.*experience/i },
  { type: "additional_info",pattern: /additional|anything.*else|other.*info|comments/i },
];

// ─── Select / dropdown classification ────────────────────────────────────────

const SELECT_FIELD_MAP = [
  { type: "disability_status",  pattern: /disability|disabled|accommodation\b/i },
  { type: "veteran_status",     pattern: /veteran|military service|armed.?force|service.?member/i },
  { type: "gender",             pattern: /\bgender\b(?!.*(pay|gap|neutral))/i },
  { type: "race_ethnicity",     pattern: /\brace\b|\bethnicity\b|racial\b|ethnic\b|national.?origin/i },
  { type: "sexual_orientation", pattern: /sexual.?orient|lgbtq/i },
  { type: "employment_type",    pattern: /employment.*(type|status)|job.*(type|class)|position.*(type|class)|work.*(type|status)/i },
  { type: "work_mode",          pattern: /work.*(mode|arrangement|location\s*type|setting)|remote.*prefer|office.*prefer|location.*preference(?!.*(city|state|zip|country|street|address))/i },
  { type: "start_date",         pattern: /when.*can.*start|available.*start|start.*date|notice.*period|earliest.*start|availability.*start/i },
  { type: "experience_level",   pattern: /experience.*(level|years)|level.*experience|years.*experience(?!\s*in\s*(?:the\s*)?field)/i },
  { type: "sponsorship",        pattern: /sponsor|visa\b|work.*authoriz|legally.*authoriz|eligible.*work|right.*work/i },
  { type: "relocation",         pattern: /willing.*relocat|relocat.*willing|open.*relocat/i },
];

const PREFER_NOT_RE = /prefer.{0,10}not|decline.{0,10}(to|identify|answer)|not.{0,8}disclose|choose.{0,8}not|do\s+not\s+wish|rather\s+not\s+say|no\s+answer|prefer\s+not\s+to\s+provide|i\s+don.{0,4}t.{0,8}(disclose|identify|answer|wish)|not\s+specified/i;

function classifySelectField(el) {
  if (el.tagName !== "SELECT") return null;
  if (el.getAttribute("multiple") !== null) return null;

  const label    = getFieldLabel(el).toLowerCase();
  const name     = (el.name || "").toLowerCase();
  const elId     = (el.id || "").toLowerCase();
  const combined = `${label} ${name} ${elId}`;

  const wdId = el.getAttribute("data-automation-id") ||
    el.closest("[data-automation-id]")?.getAttribute("data-automation-id") || "";
  if (/gender/i.test(wdId))            return { type: "gender",            kind: "select", label: getFieldLabel(el) };
  if (/veteran|military/i.test(wdId))  return { type: "veteran_status",    kind: "select", label: getFieldLabel(el) };
  if (/disability/i.test(wdId))        return { type: "disability_status", kind: "select", label: getFieldLabel(el) };
  if (/ethnicity|race/i.test(wdId))    return { type: "race_ethnicity",    kind: "select", label: getFieldLabel(el) };
  if (/employmentType/i.test(wdId))    return { type: "employment_type",   kind: "select", label: getFieldLabel(el) };
  if (/workRemote|remoteType/i.test(wdId)) return { type: "work_mode",     kind: "select", label: getFieldLabel(el) };

  for (const { type, pattern } of SELECT_FIELD_MAP) {
    if (pattern.test(combined)) return { type, kind: "select", label: getFieldLabel(el) };
  }
  return null;
}

function nativeFillSelect(el, meta, profile) {
  const allOpts = [...el.options];
  const opts = allOpts.filter((o) => {
    const t = o.text.trim();
    if (!t) return false;
    if (/^(-{1,3}|—+|select|choose|please\b|pick\b|none\b$)/i.test(t)) return false;
    if (o.index === 0 && !o.value) return false;
    return true;
  });
  if (opts.length === 0) return false;

  let target = null;

  switch (meta.type) {
    case "disability_status":
    case "veteran_status":
    case "gender":
    case "race_ethnicity":
    case "sexual_orientation": {
      target = opts.find((o) => PREFER_NOT_RE.test(o.text));
      if (!target) target = opts.find((o) => /decline|not answer|no answer/i.test(o.text));
      break;
    }
    case "employment_type": {
      target = opts.find((o) => /\bfull.?time\b|\bpermanent\b/i.test(o.text));
      break;
    }
    case "work_mode": {
      if (profile?.work_mode) {
        const MODE_PAT = {
          remote:   /\bremote\b|work.?from.?home|wfh/i,
          hybrid:   /\bhybrid\b/i,
          onsite:   /\bon.?site\b|\bin.?person\b|\bin.?office\b/i,
          "on-site":/\bon.?site\b|\bin.?person\b|\bin.?office\b/i,
        };
        const pat = MODE_PAT[(profile.work_mode || "").toLowerCase().replace(/\s/g, "")];
        if (pat) target = opts.find((o) => pat.test(o.text));
      }
      break;
    }
    case "start_date": {
      target = opts.find((o) => /\bimmediately\b|\basap\b|as soon as possible/i.test(o.text));
      if (!target) target = opts.find((o) => /\b2\s*weeks?\b|\btwo\s*weeks?\b/i.test(o.text));
      if (!target) target = opts.find((o) => /\b1\s*month\b|\bone\s*month\b/i.test(o.text));
      break;
    }
    case "experience_level": {
      if (profile?.seniority) {
        const SENIORITY_PAT = {
          junior:    /junior|entry.?level|0.?[-–]2|< ?2\b|less than 2/i,
          mid:       /mid.?level|intermediate|[23][-–][45]\s*years?|3 to 5/i,
          senior:    /senior|[5-7]\+?\s*years?|5 or more/i,
          lead:      /lead|principal|staff\b/i,
          executive: /executive|director|\bvp\b|c.level/i,
        };
        const pat = SENIORITY_PAT[(profile.seniority || "").toLowerCase()];
        if (pat) target = opts.find((o) => pat.test(o.text));
      }
      break;
    }
    case "sponsorship":
    case "relocation":
    default:
      return false;
  }

  if (!target) return false;

  el.focus();
  const proto  = window.HTMLSelectElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, target.value);
  else el.value = target.value;

  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  return true;
}

function getFieldLabel(el) {
  const id = el.id;
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lbl) return lbl.innerText.trim();
  }
  if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
  if (el.placeholder) return el.placeholder.trim();
  const parentLabel = el.closest("label");
  if (parentLabel) return parentLabel.innerText.trim();

  // Oracle JET: label is on the parent oj-* custom element or a sibling oj-label.
  // el._nrOjHost is set during shadow-DOM scan; closest() cannot cross shadow boundaries.
  const ojEl = el._nrOjHost ?? el.closest(
    "oj-input-text, oj-input-email, oj-text-area, oj-input-number, oj-input-password, " +
    "oj-text-field, oj-text-area-field, " +
    "[class*='oj-inputtext'], [class*='oj-textarea'], [class*='oj-text-field']"
  );
  if (ojEl) {
    const hint = ojEl.getAttribute("label-hint") || ojEl.getAttribute("aria-label") || ojEl.getAttribute("placeholder");
    if (hint) return hint.trim();
    const ojId = ojEl.id;
    if (ojId) {
      const lbl = document.querySelector(`oj-label[for="${CSS.escape(ojId)}"], label[for="${CSS.escape(ojId)}"]`);
      if (lbl) return lbl.innerText.trim();
    }
    const prevOjLabel = ojEl.previousElementSibling;
    if (prevOjLabel && prevOjLabel.tagName.toLowerCase() === "oj-label") {
      return prevOjLabel.innerText.trim();
    }
  }

  // SAP SuccessFactors: data-compid on the input itself
  const compId = el.getAttribute("data-compid") || "";
  if (compId) {
    const readable = compId.replace(/^candidate/i, "").replace(/Input$/i, "").replace(/([A-Z])/g, " $1").trim();
    if (readable) return readable;
  }

  // iCIMS: data-field attribute on a parent container
  const icimsContainer = el.closest("[data-field]");
  if (icimsContainer) {
    const df = icimsContainer.getAttribute("data-field") || "";
    if (df) return df.replace(/_/g, " ").replace(/jobapplication/i, "").trim();
  }

  // Fieldset/legend — used by Taleo and some older ATSs
  const legend = el.closest("fieldset")?.querySelector("legend");
  if (legend?.innerText) return legend.innerText.trim().slice(0, 80);

  const prev = el.previousElementSibling;
  if (prev?.innerText) return prev.innerText.trim().slice(0, 80);
  return el.name || el.id || "";
}

// Workday: data-automation-id on input or nearest ancestor widget div
const WORKDAY_AUTOMATION_MAP = {
  "legalNameSection_firstName":        "first_name",
  "legalNameSection_lastName":         "last_name",
  "preferredNameSection_firstName":    "first_name",
  "preferredNameSection_lastName":     "last_name",
  "email":                             "email",
  "phone-number":                      "phone",
  "phoneNumber":                       "phone",
  "addressSection_city":               "location",
  "linkedInUrl":                       "linkedin",
  "linkedInProfile":                   "linkedin",
  "portfolioUrl":                      "website",
  "websiteUrl":                        "website",
  "githubUrl":                         "github",
  "salaryExpectations":                "salary",
  "desiredSalary":                     "salary",
};

// SAP SuccessFactors: data-compid on the input
const SAP_COMPID_MAP = {
  "candidatefirstnameinput":           "first_name",
  "candidatelastnameinput":            "last_name",
  "candidateemailtextinput":           "email",
  "candidateprimaryphoneinput":        "phone",
  "candidateaddressline1input":        "location",
  "candidatecityinput":                "location",
  "candidatelinkedinurlinput":         "linkedin",
  "candidatewebsiteurlinput":          "website",
};

// iCIMS: predictable id pattern
const ICIMS_ID_MAP = {
  "firstname":       "first_name",
  "lastname":        "last_name",
  "email":           "email",
  "phone":           "phone",
  "linkedin":        "linkedin",
  "github":          "github",
  "website":         "website",
  "city":            "location",
  "coverlettertext": "cover_letter",
};

function classifyField(el) {
  if (el.type === "hidden" || el.type === "submit" || el.type === "button"
      || el.type === "checkbox" || el.type === "radio") return null;

  // ── Fast-path: Workday data-automation-id ────────────────────────────────
  const wdAutoId = (
    el.getAttribute("data-automation-id") ||
    el.closest("[data-automation-id]")?.getAttribute("data-automation-id") || ""
  );
  if (wdAutoId && WORKDAY_AUTOMATION_MAP[wdAutoId]) {
    return { type: WORKDAY_AUTOMATION_MAP[wdAutoId], kind: "direct", label: getFieldLabel(el) };
  }
  if (wdAutoId === "coverLetter" || /cover.?letter/i.test(wdAutoId)) {
    return { type: "cover_letter", kind: "ai", label: getFieldLabel(el) };
  }
  if (/why.*compan|why.*role|motivation/i.test(wdAutoId)) {
    return { type: "why_company", kind: "ai", label: getFieldLabel(el) };
  }

  // ── Fast-path: SAP SuccessFactors data-compid ────────────────────────────
  const sfCompId = (el.getAttribute("data-compid") || "").toLowerCase();
  if (sfCompId && SAP_COMPID_MAP[sfCompId]) {
    return { type: SAP_COMPID_MAP[sfCompId], kind: "direct", label: getFieldLabel(el) };
  }

  // ── Fast-path: iCIMS id pattern ──────────────────────────────────────────
  const icimsId = (el.id || "").toLowerCase().replace(/icims_formfield_jobapplication/i, "");
  if (icimsId && ICIMS_ID_MAP[icimsId]) {
    return { type: ICIMS_ID_MAP[icimsId], kind: ICIMS_ID_MAP[icimsId] === "cover_letter" ? "ai" : "direct", label: getFieldLabel(el) };
  }

  const label    = getFieldLabel(el).toLowerCase();
  const name     = (el.name || "").toLowerCase();
  const ph       = (el.placeholder || "").toLowerCase();
  const combined = `${label} ${name} ${ph}`;

  // Direct fill
  for (const [type, patterns] of Object.entries(DIRECT_MAP)) {
    if (patterns.some((p) => p.test(combined))) {
      return { type, kind: "direct", label: getFieldLabel(el) };
    }
  }

  // AI fill (textareas and multi-row text inputs)
  const isMultiline = el.tagName === "TEXTAREA" || Number(el.getAttribute("rows")) > 2;
  if (isMultiline) {
    for (const { type, pattern } of AI_MAP) {
      if (pattern.test(combined)) return { type, kind: "ai", label: getFieldLabel(el) };
    }
    return { type: "other", kind: "ai", label: getFieldLabel(el) };
  }

  return null;
}

function getDirectValue(type, profile) {
  switch (type) {
    case "full_name":      return profile.full_name  ?? "";
    case "first_name":     return profile.first_name ?? "";
    case "last_name":      return profile.last_name  ?? "";
    case "email":          return profile.email      ?? "";
    case "phone":          return profile.phone      ?? "";
    case "linkedin":       return profile.linkedin   ?? "";
    case "github":         return profile.github     ?? "";
    case "website":        return profile.website    ?? "";
    case "location":       return profile.location   ?? "";
    case "salary":         return profile.salary     ?? "";
    // Address sub-fields — profile doesn't store these; return "" → skip.
    case "street_address":
    case "address_line2":
    case "zip_postal":
    case "state_province": return "";
    default:               return "";
  }
}

// ─── Native fill (React-compatible) ──────────────────────────────────────────

function nativeFill(el, value) {
  if (!value) return;
  el.focus();

  const proto = el.tagName === "TEXTAREA"
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value); else el.value = value;

  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

  if (el.value !== value) {
    try { el.select(); document.execCommand("insertText", false, value); } catch {}
  }

  // Oracle JET: fire events on parent oj-* component so Knockout observables update.
  // el._nrOjHost is set during scanFormFields() when input is inside a Shadow Root.
  const ojParent = el._nrOjHost ?? el.closest(
    "oj-input-text, oj-text-area, oj-input-number, oj-text-field, oj-text-area-field, " +
    "[class*='oj-inputtext'], [class*='oj-textarea'], [class*='oj-text-field']"
  );
  if (ojParent) {
    ojParent.dispatchEvent(new Event("input",  { bubbles: true }));
    ojParent.dispatchEvent(new Event("change", { bubbles: true }));
    ojParent.dispatchEvent(new CustomEvent("ojValueChanged", { bubbles: true, detail: { value } }));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSession() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
      if (chrome.runtime.lastError || !res) { resolve({ ok: false, loggedIn: false }); return; }
      resolve(res);
    });
  });
}

// ─── Multi-page field tracking ────────────────────────────────────────────────
//
// When a user fills page 1 of a multi-step application, we store the field types
// filled in chrome.storage.session keyed by domain. On subsequent pages we skip
// those types to avoid re-filling fields the user already submitted.

function _afDomainKey() {
  return `nr_filled_fields_${location.hostname.replace(/^www\./, "")}`;
}

function getFilledFieldTypes() {
  return new Promise((resolve) => {
    chrome.storage.session.get(_afDomainKey(), (d) => {
      const entry = d[_afDomainKey()];
      if (!entry || (Date.now() - (entry.savedAt ?? 0)) > 90 * 60 * 1000) {
        resolve([]);
      } else {
        resolve(entry.fieldTypes ?? []);
      }
    });
  });
}

function markFieldTypesFilled(fieldTypes) {
  return new Promise((resolve) => {
    const key = _afDomainKey();
    chrome.storage.session.get(key, (d) => {
      const existing = (d[key]?.fieldTypes ?? []);
      const merged   = [...new Set([...existing, ...fieldTypes])];
      chrome.storage.session.set({ [key]: { fieldTypes: merged, savedAt: Date.now() } }, resolve);
    });
  });
}

// ─── Job context (for passing to AI suggestion calls) ─────────────────────────

async function getPageJobContext() {
  // 1. Cross-site context set by content.js when user clicks "Save & Apply"
  try {
    const session = await new Promise((resolve) => {
      chrome.storage.session.get("nr_cross_site_job", (d) => resolve(d.nr_cross_site_job ?? null));
    });
    if (session && session.jobTitle && (Date.now() - (session.savedAt ?? 0)) < 60 * 60 * 1000) {
      const descEl = document.querySelector(".job-description, #job-description, [class*='jobDescription'], article, main");
      const description = descEl ? descEl.innerText.slice(0, 2000).trim() : session.jobDescription ?? "";
      return { jobTitle: session.jobTitle, company: session.company, jobDescription: description };
    }
  } catch {}

  // 2. Fall back to page scraping
  let title = null, company = null, description = null;
  if (/greenhouse\.io|grnh\.se/.test(location.href)) {
    title   = document.querySelector(".app-title, #header h1, h1")?.innerText?.trim() ?? null;
    company = document.querySelector(".company-name, .logo-text")?.innerText?.trim() ?? null;
  } else if (/lever\.co/.test(location.href)) {
    title = document.querySelector("[data-qa='posting-name'], h2, h1")?.innerText?.trim() ?? null;
    const parts = location.pathname.split("/").filter(Boolean);
    company = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, " ") : null;
  } else if (/ashbyhq\.com/.test(location.href)) {
    title = document.querySelector("h1")?.innerText?.trim() ?? null;
    const parts = location.pathname.split("/").filter(Boolean);
    company = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, " ") : null;
  } else if (/oraclecloud\.com|oracle\.com\/.*apply/.test(location.href)) {
    const siteMatch = location.pathname.match(/\/sites\/([^/]+)\//i);
    company = siteMatch
      ? decodeURIComponent(siteMatch[1]).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : null;
    const pageTitleParts = document.title.split(/\s*[|·—]\s*/).map((s) => s.trim()).filter(Boolean);
    const isOracleApply = /\/apply\//i.test(location.pathname);
    title = isOracleApply
      ? (pageTitleParts[0]?.length < 120 ? pageTitleParts[0] : null)
      : (document.querySelector("[data-bind*='Title'], [class*='jobTitle'], [class*='JobTitle'], h1")?.innerText?.trim()
          ?? (pageTitleParts[0]?.length < 120 ? pageTitleParts[0] : null));
    if (!company) company = document.querySelector("[data-bind*='OrganizationName']")?.innerText?.trim() ?? null;
    if (!company && pageTitleParts.length > 2) company = pageTitleParts[pageTitleParts.length - 2];
  } else if (/myworkdayjobs\.com/.test(location.href)) {
    title = document.querySelector("[data-automation-id='jobPostingHeader'], h1")?.innerText?.trim() ?? null;
    const wdSub = location.hostname.match(/^([^.]+)\.(?:wd\d+\.)?myworkdayjobs\.com$/i);
    company = (wdSub ? wdSub[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null)
           ?? document.querySelector("[data-automation-id='legalEntityName']")?.innerText?.trim()
           ?? location.hostname.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } else if (/smartrecruiters\.com/.test(location.href)) {
    title = document.querySelector(".job-title, h1")?.innerText?.trim() ?? null;
    company = document.querySelector(".company-name")?.innerText?.trim() ?? null;
  } else if (/icims\.com/.test(location.href)) {
    title = document.querySelector("#icims_content_form_title, .iCIMS_Header h3, h1")?.innerText?.trim() ?? null;
    company = document.querySelector("meta[property='og:site_name']")?.getAttribute("content") ?? null;
  } else if (/successfactors\.com|sapsf\.com/.test(location.href)) {
    title   = document.querySelector("[data-compid='jobReqTitle'], .jobReqHeader h1, h1")?.innerText?.trim() ?? null;
    company = document.querySelector("[data-compid='jobDetailCompanyName'], .companyName")?.innerText?.trim()
           ?? document.querySelector("meta[property='og:site_name']")?.getAttribute("content")
           ?? null;
    if (!company) {
      const sfCompMatch = location.pathname.match(/\/careers\/([^/?#]+)/);
      if (sfCompMatch) company = decodeURIComponent(sfCompMatch[1]).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } else {
    title = document.querySelector("h1, h2")?.innerText?.trim() ?? null;
    company = document.querySelector("meta[property='og:site_name']")?.getAttribute("content") ?? null;
    if (!title || !company) {
      const pgParts = (document.title ?? "").split(/\s*[-–—|]\s*/);
      if (pgParts.length >= 2) {
        if (!title) title = pgParts[0].trim();
        if (!company) company = pgParts[pgParts.length - 1].trim();
      }
    }
  }
  const descEl = document.querySelector(".job-description, #job-description, [class*='jobDescription'], article, main");
  description = descEl ? descEl.innerText.slice(0, 2000).trim() : null;
  return { jobTitle: title ?? "", company: company ?? "", jobDescription: description ?? "" };
}

// ─── Scan all fillable fields on the page ────────────────────────────────────

function scanFormFields() {
  const fields = [];
  const seen = new WeakSet();

  // ── Text inputs & textareas (light DOM) ──────────────────────────────────
  document.querySelectorAll(
    "input[type='text'], input[type='email'], input[type='tel'], input[type='url'], input[type='number'], input:not([type]), textarea, " +
    ".oj-inputtext-input, .oj-textarea-input, .oj-text-field-input, .oj-text-area-input, " +
    "input[data-compid], textarea[data-compid]"
  ).forEach((el) => {
    if (seen.has(el)) return;
    const meta = classifyField(el);
    if (!meta) return;
    seen.add(el);
    fields.push({ el, meta });
  });

  // ── Oracle JET Shadow DOM (JET v6+ Web Components) ────────────────────────
  document.querySelectorAll(
    "oj-input-text, oj-input-email, oj-text-area, oj-input-number, oj-input-password, " +
    "oj-text-field, oj-text-area-field"
  ).forEach((ojEl) => {
    if (ojEl.querySelector("input, textarea")) return; // light DOM already handled above
    if (!ojEl.shadowRoot) return;
    const inner = ojEl.shadowRoot.querySelector("input, textarea");
    if (!inner || seen.has(inner)) return;
    inner._nrOjHost = ojEl; // store host — closest() can't cross shadow boundary
    const meta = classifyField(inner);
    if (!meta) return;
    seen.add(inner);
    fields.push({ el: inner, meta });
  });

  // ── Select / dropdown elements ────────────────────────────────────────────
  document.querySelectorAll("select").forEach((el) => {
    if (seen.has(el)) return;
    const meta = classifySelectField(el);
    if (!meta) return;
    seen.add(el);
    fields.push({ el, meta });
  });

  return fields;
}

// ─── Submit button detection ──────────────────────────────────────────────────

function findSubmitButton() {
  const explicit = document.querySelector("input[type='submit'], button[type='submit']");
  if (explicit) return explicit;
  const sfSubmit = document.querySelector("[data-compid='submitButton'], [data-compid='applyButton']");
  if (sfSubmit) return sfSubmit;
  const wdSubmit = document.querySelector("[data-automation-id='bottom-navigation-next-button'], [data-automation-id='Submit-button']");
  if (wdSubmit) return wdSubmit;
  const candidates = [...document.querySelectorAll("button, input[type='button']")];
  return candidates.find((b) => {
    const t = (b.innerText || b.value || "").toLowerCase();
    return /submit|apply now|send application|next step|continue/i.test(t);
  }) ?? null;
}

// ─── Field registry & event protocol ─────────────────────────────────────────
//
// apply-card.js dispatches nr:scan-req to request a scan.
// We scan, build a registry keyed by field ID, and respond with nr:scan-res.
// apply-card.js then dispatches nr:write with the values to write.
// We write them using nativeFill / nativeFillSelect and respond with nr:write-done.

let _fieldRegistry = {}; // fieldId → { el, meta }
let _lastProfile   = {}; // cached profile for select filling

document.addEventListener("nr:scan-req", async () => {
  const profileRes = await new Promise((r) => chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r));
  _lastProfile = profileRes?.profile ?? {};

  const rawFields = scanFormFields();
  _fieldRegistry  = {};

  const fieldData = rawFields.map((f, i) => {
    const id = `nrf_${i}`;
    _fieldRegistry[id] = { el: f.el, meta: f.meta };
    return {
      id,
      label:        f.meta.label || f.meta.type,
      type:         f.meta.type,
      kind:         f.meta.kind,
      profileValue: getDirectValue(f.meta.type, _lastProfile),
      currentValue: f.el.value ?? "",
    };
  });

  document.dispatchEvent(new CustomEvent("nr:scan-res", { detail: { fields: fieldData } }));
});

document.addEventListener("nr:write", (e) => {
  const values = e.detail?.values ?? {};
  let written = 0;
  const filledTypes = [];

  for (const [id, value] of Object.entries(values)) {
    const entry = _fieldRegistry[id];
    if (!entry) continue;

    if (entry.meta.kind === "select") {
      // value may be "__select__" (placeholder from apply-card.js) or a real string —
      // in both cases nativeFillSelect picks the best option using profile + meta.type
      const ok = nativeFillSelect(entry.el, entry.meta, _lastProfile);
      if (ok) { written++; filledTypes.push(entry.meta.type); }
    } else if (value && value !== "__select__") {
      nativeFill(entry.el, value);
      written++;
      filledTypes.push(entry.meta.type);
    }
  }

  // Persist for multi-page tracking
  if (filledTypes.length > 0) {
    markFieldTypesFilled(filledTypes);
  }

  document.dispatchEvent(new CustomEvent("nr:write-done", { detail: { written } }));
});

// ─── SPA navigation support ───────────────────────────────────────────────────
// Oracle HCM / Workday / Greenhouse are SPAs — navigating from job-preview to
// apply page uses pushState, so content scripts don't re-run.  Intercept
// pushState/replaceState, reset the field registry, and notify apply-card.js.

(function () {
  const _push    = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);

  function onSpaNav() {
    setTimeout(() => {
      _fieldRegistry = {};
      // Notify apply-card.js so it can re-evaluate auto-trigger
      document.dispatchEvent(new CustomEvent("nr:page-changed"));
    }, 600);
  }

  history.pushState    = function (...args) { _push(...args);    onSpaNav(); };
  history.replaceState = function (...args) { _replace(...args); onSpaNav(); };
  window.addEventListener("popstate", onSpaNav);
})();

})();
