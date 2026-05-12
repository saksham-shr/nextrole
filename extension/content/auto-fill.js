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
  // FAANG career pages
  /\bamazon\.jobs\b/,
  /hiring\.amazon\.com/,
  /amazon\.dejobs\.org/,
  /metacareers\.com/,
  /careers\.meta\.com/,
  /careers\.google\.com/,
  /google\.com\/about\/careers/,
  /jobs\.apple\.com/,
  /careers\.microsoft\.com/,
  /jobs\.careers\.microsoft\.com/,
  // Generic survey forms used as ad-hoc job applications
  /docs\.google\.com\/forms/,
  /forms\.gle/,
  /forms\.office\.com/,
  /forms\.microsoft\.com/,
  // Easy-apply overlays
  /linkedin\.com\/jobs/,
  /apply\.indeed\.com/,
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

// ─── Profile-driven option matchers ──────────────────────────────────────────
//
// These convert a profile field value into a RegExp that matches the right
// option label in a dropdown. They handle the cross-locale and synonym matching
// (e.g. profile.country = "United States" → matches "US", "U.S.", "USA").

// ISO-2 → phone country code mapping for the most common Workday countries.
// Returns the dialing code (without + prefix). Used by countryPhoneCode dropdowns.
const PHONE_CODES = {
  india: "91", "united states": "1", "united kingdom": "44", canada: "1",
  australia: "61", germany: "49", france: "33", netherlands: "31",
  ireland: "353", singapore: "65", "united arab emirates": "971", japan: "81",
  spain: "34", italy: "39", brazil: "55", "south africa": "27",
};

function _countryPattern(country) {
  if (!country) return /\bindia\b/i; // legacy default
  const c = country.toLowerCase().trim();
  if (c === "united states" || c === "usa" || c === "us") return /united\s*states|\bUSA?\b|\bUS\b/i;
  if (c === "united kingdom" || c === "uk")               return /united\s*kingdom|\bUK\b|britain|england/i;
  if (c === "united arab emirates" || c === "uae")        return /united\s*arab|\bUAE\b/i;
  // Default: word-boundary literal match
  return new RegExp(`\\b${c.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i");
}

function _phoneCodePattern(country) {
  const code = PHONE_CODES[(country ?? "").toLowerCase()] ?? "91";
  return new RegExp(`\\+?\\s*${code}\\b|\\b${(country ?? "India").replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i");
}

// notice_period → option label pattern
function _noticePattern(notice) {
  switch ((notice ?? "").toLowerCase()) {
    case "immediately":  return /\bimmediately\b|\basap\b|as soon as possible|available now/i;
    case "2_weeks":      return /\b2\s*weeks?\b|\btwo\s*weeks?\b|14\s*days/i;
    case "1_month":      return /\b1\s*month\b|\bone\s*month\b|30\s*days/i;
    case "2_months":     return /\b2\s*months?\b|\btwo\s*months?\b|60\s*days/i;
    case "3_months":     return /\b3\s*months?\b|\bthree\s*months?\b|90\s*days/i;
    default:             return /\bimmediately\b|\basap\b|2\s*weeks?/i;
  }
}

// Yes/No patterns for sponsorship / relocation / work-authorization
const _YES_RE = /^\s*yes\b|i\s*am|i\s*do|authorized|eligible|will|positive|true|✓/i;
const _NO_RE  = /^\s*no\b|i\s*am\s*not|i\s*do\s*not|don.t|do\s*not|negative|false|none|n\/a/i;

// Race / ethnicity — match user's free-text input against option labels, with
// some common alias coverage so "asian" matches "Asian (not Hispanic or Latino)" etc.
function _racePattern(race) {
  if (!race) return null;
  const r = race.toLowerCase().trim();
  // Common normalizations
  if (/asian|indian|south.?asian/.test(r)) return /asian|indian|south.?asian/i;
  if (/black|african/.test(r))             return /black|african/i;
  if (/white|caucasian/.test(r))           return /white|caucasian/i;
  if (/hispanic|latin/.test(r))            return /hispanic|latin/i;
  if (/native|indigenous/.test(r))         return /native|indigenous|american\s+indian|alaska/i;
  if (/pacific|hawaiian/.test(r))          return /pacific|hawaiian/i;
  if (/two.?or.?more|mixed|multi/.test(r)) return /two.?or.?more|multi.?racial|mixed/i;
  if (/prefer.?not|decline/.test(r))       return /prefer.*not|decline|do\s*not\s*wish/i;
  // Fall back to literal match
  return new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

// Pronouns — match common renderings ("she/her", "She / Her", "She her")
function _pronounsPattern(pronouns) {
  switch ((pronouns ?? "").toLowerCase()) {
    case "he_him":             return /he\s*[/\s]\s*him|\bhe\/him\b/i;
    case "she_her":            return /she\s*[/\s]\s*her|\bshe\/her\b/i;
    case "they_them":          return /they\s*[/\s]\s*them|\bthey\/them\b/i;
    case "prefer_not_to_say":  return /prefer\s*not|decline|i\s*choose\s*not/i;
    default:                   return null;
  }
}

function _veteranPattern(veteran) {
  switch ((veteran ?? "").toLowerCase()) {
    case "protected_veteran":  return /protected\s*veteran|\bam\s*a\s*protected|yes.*veteran/i;
    case "not_veteran":        return /not\s*a\s*protected|not\s*a\s*veteran|i\s*am\s*not|not\s*applicable|none\b/i;
    case "prefer_not_to_say":  return /prefer\s*not|decline|i\s*choose\s*not|don.?t\s*wish/i;
    default:                   return /not\s*a\s*protected|not\s*a\s*veteran/i; // safe default
  }
}

function _disabilityPattern(disability) {
  switch ((disability ?? "").toLowerCase()) {
    case "yes":                return /^\s*yes\b|i\s*have\s*a\s*disab|yes.*disab/i;
    case "no":                 return /^\s*no\b|i\s*don.?t\s*have|no.*disab|no\b.*identify/i;
    case "prefer_not_to_say":  return /prefer\s*not|decline|i\s*choose\s*not|don.?t\s*wish/i;
    default:                   return /^\s*no\b|i\s*don.?t\s*have|no.*disab/i; // safe default
  }
}

function _genderPattern(gender) {
  switch ((gender ?? "").toLowerCase()) {
    case "male":               return /\bmale\b(?!.*female)|^\s*man\b/i;
    case "female":             return /\bfemale\b|\bwoman\b/i;
    case "non_binary":         return /non.?binary|\bother\b/i;
    case "prefer_not_to_say":  return /prefer\s*not|decline|do\s*not\s*wish/i;
    default:                   return null;
  }
}

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
      // notice_period drives this; fall back to "immediately" if not set
      const pat = _noticePattern(profile?.notice_period);
      target = opts.find((o) => pat.test(o.text));
      if (!target) target = opts.find((o) => /\bimmediately\b|\basap\b/i.test(o.text));
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
    case "sponsorship": {
      // "Do you need sponsorship?" — answer Yes if profile says they need it
      // "Are you authorized to work?" / "Eligible to work?" — these need the
      // OPPOSITE answer. We disambiguate from the field label (passed via meta).
      const labelLow = (meta.label ?? "").toLowerCase();
      const isAuthorizedQ = /authoriz|eligible|right.*work|legally/i.test(labelLow);
      const needsSponsorship = profile?.sponsorship_needed === true;
      // Authorized question: yes if NOT needing sponsorship; otherwise yes if needing
      const wantYes = isAuthorizedQ ? !needsSponsorship : needsSponsorship;
      target = opts.find((o) => (wantYes ? _YES_RE : _NO_RE).test(o.text));
      break;
    }
    case "relocation": {
      const willing = profile?.willing_to_relocate !== false; // default true
      target = opts.find((o) => (willing ? _YES_RE : _NO_RE).test(o.text));
      break;
    }
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

// Workday: keyed by either data-automation-id OR input name= attribute.
// Real DOM (confirmed from Walmart Workday PDF inspect, 2025):
//   inputs use name= not data-automation-id — e.g. name="legalName--firstName"
//   buttons (dropdowns) use name= — e.g. name="country"
// The fast-path (_wdInput / _wdDropdown) handles these directly.
// This map is used by the general scan fallback (classifyField) which walks
// data-automation-id on ancestor containers — keep both forms for coverage.
const WORKDAY_AUTOMATION_MAP = {
  // Confirmed real name= attribute values (double-dash format)
  "legalName--firstName":              "first_name",
  "legalName--lastName":               "last_name",
  "legalName--firstNameLocal":         "first_name",
  "legalName--lastNameLocal":          "last_name",
  "preferredName--firstName":          "first_name",
  "preferredName--lastName":           "last_name",
  // Legacy / alternate company instances (underscore format — kept for fallback)
  "legalNameSection_firstName":        "first_name",
  "legalNameSection_lastName":         "last_name",
  "preferredNameSection_firstName":    "first_name",
  "preferredNameSection_lastName":     "last_name",
  // Contact fields
  "email":                             "email",
  "phone-number":                      "phone",
  "phoneNumber":                       "phone",
  // Address
  "city":                              "location",
  "addressSection_city":               "location",
  // Social / portfolio
  "linkedInHomePage":                  "linkedin",
  "linkedInUrl":                       "linkedin",
  "linkedInProfile":                   "linkedin",
  "gitHubHomePage":                    "github",
  "githubUrl":                         "github",
  "gitHubUrl":                         "github",
  "portfolioUrl":                      "website",
  "websiteUrl":                        "website",
  "personalUrl":                       "website",
  // Compensation
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

  // ── Fast-path: Workday ───────────────────────────────────────────────────
  // Real Workday DOM uses name= on inputs (e.g. name="legalName--firstName"),
  // so check name= first, then fall back to data-automation-id on self/ancestor.
  const wdNameAttr = el.getAttribute("name") || "";
  if (wdNameAttr && WORKDAY_AUTOMATION_MAP[wdNameAttr]) {
    return { type: WORKDAY_AUTOMATION_MAP[wdNameAttr], kind: "direct", label: getFieldLabel(el) };
  }
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

  // ── Naukri chatbot guard ────────────────────────────────────────────────────
  // When Naukri's Q&A panel is active (#chatbot-container has children), scanning
  // the page finds the chat textarea and dispatching synthetic events on it causes
  // Naukri to fire validation / premature submission. Skip the scan entirely and
  // tell apply-card.js to render the passive Q&A helper instead.
  const naukriChatbot = document.querySelector("#chatbot-container");
  if (naukriChatbot && naukriChatbot.children.length > 0) {
    document.dispatchEvent(new CustomEvent("nr:scan-res", {
      detail: { fields: [], naukriChatbotActive: true },
    }));
    return;
  }
  // ── Accenture prejoiner guard ───────────────────────────────────────────────
  // The Accenture prejoiner is an Angular 18 multi-step form hosted on
  // azurewebsites.net. Scanning its reactive form causes Angular change-detection
  // side-effects. Return early and let apply-card.js render the passive helper.
  const isAccenturePrejoiner =
    location.hostname.includes("azurewebsites.net") &&
    !!document.querySelector(
      "app-candidate-details, app-upload-resume, app-additional-information"
    );
  if (isAccenturePrejoiner) {
    const accentureStep =
      document
        .querySelector("mat-step-header.activeStep .mat-step-text-label")
        ?.textContent?.trim() ?? "unknown";
    document.dispatchEvent(new CustomEvent("nr:scan-res", {
      detail: { fields: [], accentureFormActive: true, accentureStep },
    }));
    return;
  }
  // ───────────────────────────────────────────────────────────────────────────

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
  // ── Naukri chatbot safety guard ─────────────────────────────────────────────
  // The chatbot may have opened between the scan and the write (e.g. delayed DOM
  // render). Refuse to write so we never fire synthetic events on the chat textarea.
  const naukriChatbotNow = document.querySelector("#chatbot-container");
  if (naukriChatbotNow && naukriChatbotNow.children.length > 0) {
    document.dispatchEvent(new CustomEvent("nr:write-done", {
      detail: { written: 0, naukriChatbotActive: true },
    }));
    return;
  }
  // ───────────────────────────────────────────────────────────────────────────

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

// ─── Accenture Angular form auto-filler ──────────────────────────────────────
//
// Responds to nr:accenture-fill CustomEvent from apply-card.js.
// Uses Angular-compatible DOM manipulation (native setter + synthetic events,
// mat-select click-open, mat-radio click, mat-checkbox click, DataTransfer file inject).

function _angularFillInput(el, value) {
  if (!el || value == null || value === "") return false;
  try {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    return true;
  } catch { return false; }
}

async function _angularClickMatSelect(matSelectEl, optionPattern) {
  if (!matSelectEl) return false;
  try {
    matSelectEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 350));
    const options = [...document.querySelectorAll("mat-option")];
    const target  = options.find((o) => optionPattern.test(o.textContent?.trim() ?? ""));
    if (!target) {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => setTimeout(r, 100));
      return false;
    }
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 200));
    return true;
  } catch { return false; }
}

function _angularClickMatRadio(container, pattern) {
  if (!container) return false;
  const buttons = [...container.querySelectorAll("mat-radio-button")];
  const target  = buttons.find((b) => pattern.test(b.textContent?.trim() ?? ""));
  if (!target) return false;
  const input = target.querySelector("input[type=radio]");
  if (input) input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return true;
}

function _angularCheckCheckbox(el) {
  if (!el) return false;
  const input = el.querySelector("input[type=checkbox]") ??
    (el.matches("input[type=checkbox]") ? el : null);
  if (!input) return false;
  if (input.checked) return true; // already checked
  input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return true;
}

function _injectFile(inputEl, blob, filename) {
  if (!inputEl || !blob) return false;
  try {
    const file = new File([blob], filename, { type: blob.type });
    const dt   = new DataTransfer();
    dt.items.add(file);
    inputEl.files = dt.files;
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    inputEl.dispatchEvent(new Event("input",  { bubbles: true }));
    return true;
  } catch { return false; }
}

function _findMatFieldByLabel(pattern) {
  const candidates = document.querySelectorAll("mat-label, label, .mat-form-field-label, legend");
  for (const lbl of candidates) {
    if (!pattern.test(lbl.textContent?.trim() ?? "")) continue;
    return lbl.closest("mat-form-field, .mat-form-field, fieldset") ?? lbl.parentElement;
  }
  return null;
}

function _findInputByLabel(pattern) {
  const labels = [...document.querySelectorAll("label, mat-label")];
  for (const lbl of labels) {
    if (!pattern.test(lbl.textContent?.trim() ?? "")) continue;
    if (lbl.htmlFor) {
      const el = document.getElementById(lbl.htmlFor);
      if (el) return el;
    }
    const field = lbl.closest("mat-form-field, .mat-form-field, .form-group") ?? lbl.parentElement;
    const inp   = field?.querySelector("input:not([type=hidden]), textarea");
    if (inp) return inp;
  }
  return null;
}

async function _fillAccentureStep(stepNum, profile, resumeBlob) {
  const result = { filled: 0, skipped: 0, errors: [] };

  // ── Step 1: Upload Resume ──────────────────────────────────────────────────
  if (stepNum === 1) {
    if (resumeBlob) {
      const fileInput = document.querySelector(
        "app-upload-resume input[type=file], input[type=file][accept*=doc], input[type=file][accept*=pdf], input[type=file]",
      );
      if (_injectFile(fileInput, resumeBlob, "nextrole_resume.doc")) result.filled++;
      else result.errors.push("Could not find file input to inject resume");
    } else {
      result.skipped++;
      result.errors.push("No resume blob provided");
    }
    return result;
  }

  // ── Step 2: Additional Information ────────────────────────────────────────
  if (stepNum === 2) {
    // Nationality → India
    const natField  = _findMatFieldByLabel(/nationality/i);
    const natSelect = natField?.querySelector("mat-select");
    if (natSelect) {
      (await _angularClickMatSelect(natSelect, _countryPattern(profile?.nationality ?? "India"))) ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // Citizenship → Citizen India
    const citField  = _findMatFieldByLabel(/citizenship/i);
    const citSelect = citField?.querySelector("mat-select");
    if (citSelect) {
      (await _angularClickMatSelect(citSelect, /citizen.*india|india.*citizen/i))
        ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // PAN Card — no profile data → skip
    result.skipped++;
    // Date of Birth — pre-filled from Accenture account → skip
    result.skipped++;
    return result;
  }

  // ── Step 3: My Information ────────────────────────────────────────────────
  if (stepNum === 3) {
    // "How did you hear about us?" dropdown
    const heardField  = _findMatFieldByLabel(/hear.*about|source|referral|come.*know/i);
    const heardSelect = heardField?.querySelector("mat-select");
    if (heardSelect) {
      let ok = await _angularClickMatSelect(heardSelect, /naukri/i);
      if (!ok) ok = await _angularClickMatSelect(heardSelect, /job\s*portal|online.*portal|portal|job\s*board/i);
      ok ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // "Previously worked for Accenture?" → No
    const allRadioGroups = [...document.querySelectorAll("mat-radio-group")];
    const prevRadio = allRadioGroups.find((g) =>
      /previous.*accenture|accenture.*before|work.*accenture|employed.*accenture/i.test(
        g.closest("mat-form-field, .question-block, .form-field-wrap, div")?.textContent ?? "",
      ),
    );
    if (prevRadio) {
      _angularClickMatRadio(prevRadio, /\bno\b/i) ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // Gender — from profile if available
    if (profile?.gender) {
      const genderField  = _findMatFieldByLabel(/\bgender\b/i);
      const genderSelect = genderField?.querySelector("mat-select");
      if (genderSelect) {
        const GPAT = {
          male:   /\bmale\b(?!.*female)/i,
          female: /\bfemale\b|\bwoman\b/i,
          other:  /\bother\b|\bnon.?binary\b/i,
        };
        const pat = GPAT[(profile.gender || "").toLowerCase()] ?? new RegExp(profile.gender, "i");
        (await _angularClickMatSelect(genderSelect, pat)) ? result.filled++ : result.skipped++;
      } else result.skipped++;
    } else result.skipped++;

    // Disability → No
    const disRadio = allRadioGroups.find((g) =>
      /disab/i.test(g.closest("mat-form-field, .question-block, .form-field-wrap, div")?.textContent ?? ""),
    );
    if (disRadio) {
      _angularClickMatRadio(disRadio, /\bno\b/i) ? result.filled++ : result.skipped++;
    } else {
      const disField  = _findMatFieldByLabel(/disab/i);
      const disSelect = disField?.querySelector("mat-select");
      if (disSelect) {
        (await _angularClickMatSelect(disSelect, /\bno\b/i)) ? result.filled++ : result.skipped++;
      } else result.skipped++;
    }
    return result;
  }

  // ── Step 4: Address ───────────────────────────────────────────────────────
  if (stepNum === 4) {
    // Country → India
    const countryField  = _findMatFieldByLabel(/\bcountry\b/i);
    const countrySelect = countryField?.querySelector("mat-select");
    if (countrySelect) {
      (await _angularClickMatSelect(countrySelect, _countryPattern(profile?.country))) ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // City — from profile.location
    if (profile?.location) {
      let cityFilled = false;
      // Try plain text input first
      const cityInp = _findInputByLabel(/\bcity\b/i);
      if (cityInp) {
        cityFilled = _angularFillInput(cityInp, profile.location);
      }
      // Try ng-select typeahead
      if (!cityFilled) {
        const cityField    = _findMatFieldByLabel(/\bcity\b/i);
        const cityNgSelect = cityField?.querySelector("ng-select");
        const searchInp    = cityNgSelect?.querySelector("input");
        if (searchInp) {
          _angularFillInput(searchInp, profile.location);
          await new Promise((r) => setTimeout(r, 500));
          const opt = document.querySelector("ng-dropdown-panel .ng-option");
          if (opt) { opt.dispatchEvent(new MouseEvent("click", { bubbles: true })); cityFilled = true; }
        }
      }
      cityFilled ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // Address lines, Postal, State — no profile data → skip
    result.skipped += 4;
    return result;
  }

  // ── Step 5: Experience ────────────────────────────────────────────────────
  if (stepNum === 5) {
    // "Do you have work experience?" radio
    const hasExp   = (profile?.years_experience ?? 0) > 0;
    const allRadio = [...document.querySelectorAll("mat-radio-group")];
    const expRadio = allRadio.find((g) =>
      /work.*exp|experience/i.test(
        g.closest("mat-form-field, .question-block, .form-field-wrap, div")?.textContent ?? "",
      ),
    );
    if (expRadio) {
      _angularClickMatRadio(expRadio, hasExp ? /\byes\b/i : /\bno\b/i) ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // Skills — ng-select typeahead. Prefer profile.skills (explicit) over
    // target_roles (which are job-titles, used only as legacy fallback).
    const skills = (
      (Array.isArray(profile?.skills) && profile.skills.length > 0)
        ? profile.skills
        : (profile?.target_roles ?? [])
    ).slice(0, 5);
    if (skills.length > 0) {
      const skillsField    = _findMatFieldByLabel(/skill/i);
      const skillsNgSelect = skillsField?.querySelector("ng-select") ??
        document.querySelector("ng-select[placeholder*=skill i], ng-select");
      if (skillsNgSelect) {
        let added = 0;
        for (const skill of skills) {
          const inp = skillsNgSelect.querySelector("input");
          if (!inp) break;
          _angularFillInput(inp, skill);
          await new Promise((r) => setTimeout(r, 500));
          const opt = document.querySelector("ng-dropdown-panel .ng-option");
          if (opt) {
            opt.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            added++;
            await new Promise((r) => setTimeout(r, 250));
          } else {
            // Clear if no match found
            _angularFillInput(inp, "");
          }
        }
        added > 0 ? result.filled++ : result.skipped++;
      } else result.skipped++;
    } else result.skipped++;
    return result;
  }

  // ── Step 6: Education ────────────────────────────────────────────────────
  if (stepNum === 6) {
    // Degree type dropdown
    const degField  = _findMatFieldByLabel(/degree|qualification|level.*education/i);
    const degSelect = degField?.querySelector("mat-select");
    if (degSelect) {
      (await _angularClickMatSelect(degSelect, /bachelor|b\.?e\.?|b\.?tech|graduate/i))
        ? result.filled++ : result.skipped++;
    } else result.skipped++;

    // University, Field of Study, From/To — require exact certificate data → skip
    result.skipped += 4;
    return result;
  }

  // ── Step 7: Picture Upload ────────────────────────────────────────────────
  if (stepNum === 7) {
    result.skipped = 1;
    result.errors.push("Photo capture requires webcam — manual action needed");
    return result;
  }

  // ── Step 8: Review / Checkboxes ──────────────────────────────────────────
  if (stepNum === 8) {
    const checkboxes = [
      ...document.querySelectorAll("mat-checkbox"),
      ...document.querySelectorAll("input[type=checkbox]"),
    ];
    for (const cb of checkboxes) {
      if (_angularCheckCheckbox(cb)) result.filled++;
    }
    if (checkboxes.length === 0) {
      result.skipped++;
      result.errors.push("No checkboxes found — scroll to Review section first");
    }
    return result;
  }

  result.skipped++;
  result.errors.push(`Unknown step number: ${stepNum}`);
  return result;
}

// ─── Workday date input helper ────────────────────────────────────────────────
// Workday date fields are either plain text inputs (type date or text) or
// fkit date-section widgets with separate month / year inputs.
// We try direct value injection first, then the split month/year approach.

async function _wdFillDate(containerSel, mmYyyy) {
  if (!mmYyyy) return false;
  const container = typeof containerSel === "string"
    ? document.querySelector(containerSel)
    : containerSel;
  if (!container) return false;

  // Normalise to MM/YYYY — input may be "YYYY", "MM/YYYY", "Mon YYYY" etc.
  let month = "", year = "";
  const mmYyyyMatch = mmYyyy.match(/^(\d{1,2})\/(\d{4})$/);
  const yyyyMatch   = mmYyyy.match(/^(\d{4})$/);
  const monYyyy     = mmYyyy.match(/([A-Za-z]{3,9})\s+(\d{4})/);
  if (mmYyyyMatch) { month = mmYyyyMatch[1].padStart(2, "0"); year = mmYyyyMatch[2]; }
  else if (yyyyMatch) { year = yyyyMatch[1]; }
  else if (monYyyy) {
    const MONTHS = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
                     jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
    month = MONTHS[monYyyy[1].toLowerCase().slice(0,3)] ?? "";
    year  = monYyyy[2];
  }

  // Try single date input first
  const singleInput = container.querySelector("input[type='date'], input[type='text'][placeholder*='date' i], input[name*='date' i]");
  if (singleInput) {
    const val = month ? `${year}-${month}-01` : year;
    _angularFillInput(singleInput, val);
    return true;
  }

  // Workday split: separate month and year inputs inside the date-section
  const monthInput = container.querySelector("[data-automation-id*='month' i] input, input[placeholder='MM'], input[aria-label*='month' i]");
  const yearInput  = container.querySelector("[data-automation-id*='year'  i] input, input[placeholder='YYYY'], input[aria-label*='year'  i]");
  let hit = false;
  if (monthInput && month) { _angularFillInput(monthInput, month); hit = true; }
  if (yearInput  && year)  { _angularFillInput(yearInput,  year);  hit = true; }
  return hit;
}

// ─── Workday "Add entry" modal helpers ───────────────────────────────────────

async function _wdOpenAddModal(sectionAutomationId) {
  // Find the section container, then its Add button.
  // Workday uses data-automation-id on section wrappers.
  const section = document.querySelector(`[data-automation-id="${sectionAutomationId}"]`);
  const addBtn  = section
    ? section.querySelector("button[data-automation-id*='add' i], button[aria-label*='add' i], button")
    : document.querySelector(
        `[data-automation-id="${sectionAutomationId}AddButton"], ` +
        `button[data-automation-id="add-${sectionAutomationId}"], ` +
        `button[aria-label*="Add ${sectionAutomationId}" i]`,
      );
  if (!addBtn) return false;
  addBtn.click();
  await new Promise((r) => setTimeout(r, 600));
  return !!document.querySelector('[role="dialog"], [data-automation-id="wd-Dialog"]');
}

async function _wdSaveModal() {
  const dialog = document.querySelector('[role="dialog"], [data-automation-id="wd-Dialog"]');
  if (!dialog) return false;
  const saveBtn =
    dialog.querySelector('[data-automation-id="saveButton"], [data-automation-id="submitButton"]') ??
    [...dialog.querySelectorAll("button")].find((b) => /save|ok|done|add/i.test(b.textContent ?? ""));
  if (!saveBtn) return false;
  saveBtn.click();
  await new Promise((r) => setTimeout(r, 500));
  return true;
}

// ─── Workday section helpers (wrapper-based, DOM verified Nvidia/Walmart) ───
//
// Workday wraps every form field in a div whose data-automation-id is
// "formField-<fieldName>" and whose data-fkit-id is "<entity-N>--<fieldName>".
// Entries (work experience, education) are added inline on the page — there is
// no modal — by clicking the section's "Add" button. Each new entry is given
// a unique entity index (workExperience-7, education-42, etc.), and all of its
// fields share that prefix in their data-fkit-id.

// Find the formField wrapper inside a section, optionally filtered to a
// specific entry index (latest if not specified).
function _wdGetFieldByFkit(scope, entityPrefix, entityIdx, fieldName) {
  const sel = entityIdx === null
    ? `[data-fkit-id$="--${fieldName}"][data-fkit-id^="${entityPrefix}-"]`
    : `[data-fkit-id="${entityPrefix}-${entityIdx}--${fieldName}"]`;
  return scope.querySelector(sel);
}

// Find the "Add" button for a named section (e.g. "Work-Experience-section").
// Walks forward from the section header until it finds the next add-button.
function _wdFindAddButton(sectionHeaderId) {
  const header = document.getElementById(sectionHeaderId);
  if (!header) return null;
  // Walk up to find the enclosing group, then look for add-button inside it.
  let scope = header.parentElement;
  while (scope && scope !== document.body) {
    const btn = scope.querySelector('[data-automation-id="add-button"]');
    if (btn) return btn;
    scope = scope.parentElement;
  }
  return null;
}

// After clicking Add, find the index of the newest entry created. Returns the
// numeric portion of the last data-fkit-id matching "<prefix>-N--<sentinelField>".
// For workExperience, sentinelField is "jobTitle"; for education, "schoolName".
function _wdLatestEntityIndex(scope, entityPrefix, sentinelField) {
  const all = scope.querySelectorAll(
    `[data-fkit-id$="--${sentinelField}"][data-fkit-id^="${entityPrefix}-"]`,
  );
  let maxIdx = -1;
  for (const el of all) {
    const m = el.getAttribute("data-fkit-id")?.match(
      new RegExp(`^${entityPrefix}-(\\d+)--`),
    );
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxIdx) maxIdx = n;
    }
  }
  return maxIdx >= 0 ? maxIdx : null;
}

// Fill a month + year date pair inside a date-section wrapper.
async function _wdFillFkitDate(wrap, mmYyyy) {
  if (!wrap || !mmYyyy) return false;
  let month = "", year = "";
  const mmYyyyMatch = mmYyyy.match(/^(\d{1,2})\/(\d{4})$/);
  const yyyyMatch   = mmYyyy.match(/^(\d{4})$/);
  const monYyyy     = mmYyyy.match(/([A-Za-z]{3,9})\s+(\d{4})/);
  if (mmYyyyMatch)        { month = mmYyyyMatch[1].padStart(2, "0"); year = mmYyyyMatch[2]; }
  else if (yyyyMatch)     { year = yyyyMatch[1]; }
  else if (monYyyy) {
    const M = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
                jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
    month = M[monYyyy[1].toLowerCase().slice(0,3)] ?? "";
    year  = monYyyy[2];
  }
  const mIn = wrap.querySelector('[data-automation-id="dateSectionMonth-input"]');
  const yIn = wrap.querySelector('[data-automation-id="dateSectionYear-input"]');
  let hit = false;
  if (mIn && month) { _angularFillInput(mIn, month); hit = true; }
  if (yIn && year)  { _angularFillInput(yIn,  year);  hit = true; }
  return hit;
}

// Add a list of skills to the Workday skills typeahead one by one.
// The skills field renders zero options until the user types — so for each
// profile skill we: focus the input → set its value → wait for the filtered
// promptOption list → click the closest match (exact > prefix > substring).
// Returns { added, skipped }.
async function _wdAddSkills(skills) {
  const result = { added: 0, skipped: 0 };
  if (!Array.isArray(skills) || skills.length === 0) return result;

  const wrap = document.querySelector('[data-automation-id="formField-skills"]');
  if (!wrap) { result.skipped = skills.length; return result; }

  const input = wrap.querySelector('input[data-uxi-widget-type="selectinput"]')
             ?? wrap.querySelector('input[type="text"]')
             ?? wrap.querySelector("input");
  if (!input) { result.skipped = skills.length; return result; }

  // Use the native setter directly so we can also force an empty string
  // (the _angularFillInput helper short-circuits on "").
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value",
  )?.set;
  function setInputValue(v) {
    if (valueSetter) valueSetter.call(input, v);
    else input.value = v;
    input.dispatchEvent(new Event("input",  { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function alreadyAddedSet() {
    const pills = wrap.querySelectorAll('[data-automation-id="selectedItem"]');
    const set = new Set();
    pills.forEach((p) => {
      const t = (p.getAttribute("title") ?? p.textContent ?? "").trim().toLowerCase();
      if (t) set.add(t);
    });
    return set;
  }

  // Poll the open Workday listbox for up to ~1.5s for a matching option.
  async function findOption(skillLower) {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const opts = [
        ...document.querySelectorAll('[data-automation-id="promptOption"]'),
        ...document.querySelectorAll('[role="option"]:not([aria-hidden="true"])'),
      ].filter((o) => o.offsetParent !== null);
      if (opts.length === 0) continue;
      const exact   = opts.find((o) => (o.textContent ?? "").trim().toLowerCase() === skillLower);
      if (exact) return exact;
      const prefix  = opts.find((o) => (o.textContent ?? "").trim().toLowerCase().startsWith(skillLower));
      if (prefix) return prefix;
      const partial = opts.find((o) => (o.textContent ?? "").trim().toLowerCase().includes(skillLower));
      if (partial) return partial;
    }
    return null;
  }

  // Workday's option list listens to mousedown — a plain `click()` doesn't
  // always commit. Dispatch the full pointer sequence.
  function pickOption(el) {
    const rect = el.getBoundingClientRect();
    const x = Math.floor(rect.left + rect.width / 2);
    const y = Math.floor(rect.top + rect.height / 2);
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
    el.dispatchEvent(new MouseEvent("mouseover", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new MouseEvent("mouseup",   opts));
    el.dispatchEvent(new MouseEvent("click",     opts));
  }

  const have = alreadyAddedSet();

  for (const raw of skills.slice(0, 20)) {
    const skill = String(raw ?? "").trim();
    if (!skill) continue;
    if (have.has(skill.toLowerCase())) continue;

    // Clear first (handles empty string properly), then focus + type.
    setInputValue("");
    await new Promise((r) => setTimeout(r, 80));
    input.focus();
    setInputValue(skill);

    const target = await findOption(skill.toLowerCase());

    if (target) {
      pickOption(target);
      await new Promise((r) => setTimeout(r, 300));
      // Confirm a pill was added; if not, count as skip and clear.
      const after = alreadyAddedSet();
      if (after.size > have.size && !have.has(skill.toLowerCase())) {
        have.add(skill.toLowerCase());
        result.added++;
      } else {
        result.skipped++;
      }
    } else {
      // No dictionary match — escape to close the popup, don't try free-text
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => setTimeout(r, 100));
      result.skipped++;
    }
  }

  // Clean up
  setInputValue("");
  input.blur();
  return result;
}

// Click a Workday-fkit combobox (multi-select) and pick the first option
// matching pattern. Returns true if an option was clicked.
async function _wdFkitCombobox(wrap, optionPattern) {
  if (!wrap) return false;
  const trigger = wrap.querySelector(
    '[data-automation-id="multiselectInputContainer"], ' +
    'input[data-uxi-widget-type="selectinput"]',
  );
  if (!trigger) return false;
  trigger.click();
  await new Promise((r) => setTimeout(r, 400));
  const opts = [
    ...document.querySelectorAll('[data-automation-id="promptOption"]'),
    ...document.querySelectorAll('[role="option"]:not([aria-hidden="true"])'),
  ];
  const target = opts.find((o) => optionPattern.test(o.textContent?.trim() ?? ""));
  if (!target) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    return false;
  }
  target.click();
  await new Promise((r) => setTimeout(r, 200));
  return true;
}

async function _fillWorkdayExperienceEntries(entries) {
  const result = { filled: 0, skipped: 0, errors: [] };
  if (!entries?.length) return result;

  for (const entry of entries) {
    // Click "Add" to create a new inline form block
    const addBtn = _wdFindAddButton("Work-Experience-section");
    if (!addBtn) {
      result.errors.push("Work Experience Add button not found");
      result.skipped += entries.length - result.filled;
      break;
    }
    addBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Find the newest entry index by scanning all workExperience-N--jobTitle wrappers
    const idx = _wdLatestEntityIndex(document, "workExperience", "jobTitle");
    if (idx === null) {
      result.errors.push("Newly added work experience entry not found in DOM");
      result.skipped++;
      continue;
    }

    let filledFields = 0;
    const field = (name) => _wdGetFieldByFkit(document, "workExperience", idx, name);

    // Job title
    const titleInp = field("jobTitle")?.querySelector("input");
    if (titleInp && entry.role) {
      _angularFillInput(titleInp, entry.role);
      filledFields++;
    }

    // Company
    const compInp = field("companyName")?.querySelector("input");
    if (compInp && entry.company) {
      _angularFillInput(compInp, entry.company);
      filledFields++;
    }

    // Location
    const locInp = field("location")?.querySelector("input");
    if (locInp && entry.location) {
      _angularFillInput(locInp, entry.location);
      filledFields++;
    }

    // Currently work here checkbox
    if (entry.current) {
      const chk = field("currentlyWorkHere")?.querySelector('input[type="checkbox"]');
      if (chk && !chk.checked) chk.click();
    }

    // Start date (month + year)
    if (entry.start) {
      const startWrap = field("startDate");
      if (await _wdFillFkitDate(startWrap, entry.start)) filledFields++;
    }

    // End date (only if not currently working there)
    if (!entry.current && entry.end && entry.end.toLowerCase() !== "present") {
      const endWrap = field("endDate");
      if (await _wdFillFkitDate(endWrap, entry.end)) filledFields++;
    }

    // Role description
    const descEl = field("roleDescription")?.querySelector("textarea");
    if (descEl && entry.description) {
      _angularFillInput(descEl, entry.description);
      filledFields++;
    }

    if (filledFields > 0) result.filled += filledFields;
    else result.skipped++;
    await new Promise((r) => setTimeout(r, 250));
  }
  return result;
}

async function _fillWorkdayEducationEntries(entries) {
  const result = { filled: 0, skipped: 0, errors: [] };
  if (!entries?.length) return result;

  function yearFrom(value) {
    if (!value) return "";
    const m = String(value).match(/(\d{4})/);
    return m ? m[1] : "";
  }

  for (const entry of entries) {
    const addBtn = _wdFindAddButton("Education-section");
    if (!addBtn) {
      result.errors.push("Education Add button not found");
      result.skipped += entries.length - result.filled;
      break;
    }
    addBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    const idx = _wdLatestEntityIndex(document, "education", "schoolName");
    if (idx === null) {
      result.errors.push("Newly added education entry not found in DOM");
      result.skipped++;
      continue;
    }

    let filledFields = 0;
    const field = (name) => _wdGetFieldByFkit(document, "education", idx, name);

    // School name
    const schoolInp = field("schoolName")?.querySelector("input");
    if (schoolInp && entry.institution) {
      _angularFillInput(schoolInp, entry.institution);
      filledFields++;
    }

    // Degree (dropdown)
    if (entry.degree) {
      const degreeBtn = field("degree")?.querySelector("button");
      if (degreeBtn) {
        const pat = new RegExp(entry.degree.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        if (await _wdDropdown(null, pat, degreeBtn)) filledFields++;
      }
    }

    // Field of study (fkit multi-select combobox)
    if (entry.field) {
      const fieldWrap = field("fieldOfStudy");
      const fieldPat = new RegExp(entry.field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (await _wdFkitCombobox(fieldWrap, fieldPat)) filledFields++;
    }

    // First / last year attended (year-only inputs)
    const firstYearInp = field("firstYearAttended")?.querySelector("input");
    if (firstYearInp) {
      const y = yearFrom(entry.start);
      if (y) { _angularFillInput(firstYearInp, y); filledFields++; }
    }
    const lastYearInp = field("lastYearAttended")?.querySelector("input");
    if (lastYearInp) {
      const y = yearFrom(entry.end);
      if (y) { _angularFillInput(lastYearInp, y); filledFields++; }
    }

    // Grade average (optional)
    if (entry.grade) {
      const gradeInp = field("gradeAverage")?.querySelector("input");
      if (gradeInp) { _angularFillInput(gradeInp, entry.grade); filledFields++; }
    }

    if (filledFields > 0) result.filled += filledFields;
    else result.skipped++;
    await new Promise((r) => setTimeout(r, 250));
  }
  return result;
}

async function _fillWorkdayCertEntries(entries) {
  const result = { filled: 0, skipped: 0, errors: [] };
  if (!entries?.length) return result;

  for (const entry of entries) {
    const opened = await _wdOpenAddModal("certificationSection");
    if (!opened) {
      result.errors.push("Could not open Certifications Add modal");
      result.skipped += entries.length;
      break;
    }

    const dialog = document.querySelector('[role="dialog"], [data-automation-id="wd-Dialog"]');
    if (!dialog) { result.skipped++; continue; }

    const nameInp = dialog.querySelector(
      'input[data-automation-id="certificationName"], input[name="certificationName"], ' +
      'input[aria-label*="certification" i], input[aria-label*="license" i], ' +
      'input[placeholder*="certification" i]',
    );
    if (nameInp && entry.title) _angularFillInput(nameInp, entry.title);

    const issuerInp = dialog.querySelector(
      'input[data-automation-id="issuingOrganization"], input[name="issuingOrganization"], ' +
      'input[aria-label*="issu" i], input[placeholder*="issu" i]',
    );
    if (issuerInp && entry.issuer) _angularFillInput(issuerInp, entry.issuer);

    if (entry.year) {
      const dateSection = dialog.querySelector('[data-automation-id="issueDate"]') ?? dialog;
      await _wdFillDate(dateSection, entry.year);
    }

    const saved = await _wdSaveModal();
    saved ? result.filled++ : result.skipped++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return result;
}

// ─── Workday form auto-filler ─────────────────────────────────────────────────
//
// Responds to nr:workday-fill CustomEvent from apply-card.js.
// Selectors sourced from real Workday DOM inspect (Walmart instance):
//   • Text inputs use name= attribute:  input[name="legalName--firstName"]
//   • Dropdowns are button[name="..."]: button[name="country"], button[name="phoneType"]
//   • "How Did You Hear" is an fkit combobox (div[dir="ltr"][tabindex]) inside formField-source
//   • Options always appear as [data-automation-id="promptOption"] in a portal overlay

function _wdInput(fieldNames, value) {
  // Wrapper-based: [data-automation-id="formField-<name>"] input
  if (!value) return false;
  const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  for (const n of names) {
    const wrap = document.querySelector(`[data-automation-id="formField-${n}"]`);
    const el = wrap?.querySelector("input, textarea") ??
               document.querySelector(`input[name="${n}"], textarea[name="${n}"]`);
    if (el && _angularFillInput(el, value)) return true;
  }
  return false;
}

// Click a button-dropdown inside a formField wrapper.
async function _wdFieldDropdown(fieldName, optionPattern) {
  const wrap = document.querySelector(`[data-automation-id="formField-${fieldName}"]`);
  const btn = wrap?.querySelector("button[aria-haspopup]") ??
              document.querySelector(`button[name="${fieldName}"]`);
  if (!btn) return false;
  return _wdDropdown(null, optionPattern, btn);
}

// Click a fkit multi-select inside a formField wrapper.
async function _wdFieldMultiSelect(fieldName, optionPattern) {
  const wrap = document.querySelector(`[data-automation-id="formField-${fieldName}"]`);
  return _wdFkitCombobox(wrap, optionPattern);
}

// Click a Yes/No radio inside a formField wrapper.
function _wdFieldRadio(fieldName, value) {
  const wrap = document.querySelector(`[data-automation-id="formField-${fieldName}"]`);
  if (!wrap) return false;
  const want = value === true || value === "true" || /^yes$/i.test(String(value)) ? "true" : "false";
  const radio = wrap.querySelector(`input[type="radio"][value="${want}"]`);
  if (!radio) return false;
  if (!radio.checked) radio.click();
  return true;
}

async function _wdDropdown(triggerSel, optionPattern, triggerEl) {
  // triggerSel: CSS selector string OR null (use triggerEl directly)
  const trigger = triggerEl ?? (triggerSel ? document.querySelector(triggerSel) : null);
  if (!trigger) return false;
  trigger.click();
  await new Promise((r) => setTimeout(r, 400));
  const options = [
    ...document.querySelectorAll('[data-automation-id="promptOption"]'),
    ...document.querySelectorAll('[role="option"]:not([aria-hidden="true"])'),
  ];
  const target = options.find((o) => optionPattern.test(o.textContent?.trim() ?? ""));
  if (!target) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    return false;
  }
  target.click();
  await new Promise((r) => setTimeout(r, 200));
  return true;
}

async function _fillWorkdaySection(section, profile, resumeBlob /*, coverLetterBlob*/) {
  const result = { filled: 0, skipped: 0, errors: [] };
  function hit(ok) { ok ? result.filled++ : result.skipped++; return ok; }

  // ── My Information ────────────────────────────────────────────────────────
  // Verified selectors from Walmart + Nvidia DOM inspect — tenant-uniform.
  if (section === "My Information") {
    const firstName = profile.first_name ?? (profile.full_name ?? "").split(" ")[0] ?? "";
    const lastName  = profile.last_name  ?? (profile.full_name ?? "").split(" ").slice(1).join(" ") ?? "";

    // Legal name
    hit(_wdInput("legalName--firstName", firstName));
    hit(_wdInput("legalName--lastName",  lastName));
    // Local name fields appear on country=India etc.; fill best-effort
    _wdInput("legalName--firstNameLocal", firstName);
    _wdInput("legalName--lastNameLocal",  lastName);

    // Address
    hit(_wdInput("addressLine1", profile.street_address));
    hit(_wdInput("city",         profile.city ?? profile.location));
    hit(_wdInput("postalCode",   profile.zip_postal));
    if (profile.state_province) {
      hit(await _wdFieldDropdown(
        "countryRegion",
        new RegExp(profile.state_province.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      ));
    }

    // Country
    hit(await _wdFieldDropdown("country", _countryPattern(profile.country)));

    // Phone
    hit(await _wdFieldDropdown("phoneType", /mobile|cell/i));
    hit(await _wdFieldMultiSelect("countryPhoneCode", _phoneCodePattern(profile.country)));
    hit(_wdInput("phoneNumber", profile.phone));

    // Previously worked here (default No)
    hit(_wdFieldRadio("candidateIsPreviousWorker", false));

    // "How Did You Hear About Us?" — multi-select combobox
    hit(await _wdFieldMultiSelect(
      "source",
      /naukri|linkedin|job\s*board|online|portal|internet|website|referr/i,
    ));

    return result;
  }

  // ── My Experience ─────────────────────────────────────────────────────────
  if (section === "My Experience") {
    // Resume upload
    if (resumeBlob) {
      const fileInput = document.querySelector(
        '[data-automation-id="attachments-FileUpload"] input[type=file], ' +
        'input[data-automation-id="file-upload-input-ref"], ' +
        'input[type=file]',
      );
      if (_injectFile(fileInput, resumeBlob, resumeBlob.filename ?? "nextrole_resume.pdf")) result.filled++;
      else result.skipped++;
    } else {
      result.skipped++;
    }

    // LinkedIn URL
    hit(_wdInput("linkedInAccount", profile.linkedin));

    // Skills — typeahead: type each profile skill and click the matching option
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
      const skillsResult = await _wdAddSkills(profile.skills);
      if (skillsResult.added > 0) result.filled += skillsResult.added;
      if (skillsResult.skipped > 0) {
        result.skipped += skillsResult.skipped;
        if (skillsResult.added === 0) {
          result.errors.push("Skills: no profile skill matched Workday's dictionary");
        }
      }
    }

    // Work experience entries
    const workExp = profile.work_experience ?? [];
    if (workExp.length) {
      const expResult = await _fillWorkdayExperienceEntries(workExp);
      result.filled  += expResult.filled;
      result.skipped += expResult.skipped;
      result.errors.push(...expResult.errors);
    } else {
      result.errors.push("No work experience in profile — add via /dashboard/profile");
    }

    // Education entries
    const education = profile.education ?? [];
    if (education.length) {
      const eduResult = await _fillWorkdayEducationEntries(education);
      result.filled  += eduResult.filled;
      result.skipped += eduResult.skipped;
      result.errors.push(...eduResult.errors);
    } else {
      result.errors.push("No education in profile — add via /dashboard/profile");
    }

    return result;
  }

  // ── Other sections — out of scope for v1 ──────────────────────────────────
  result.skipped++;
  result.errors.push(`Section "${section}" is not auto-filled (only My Information and My Experience are supported).`);
  return result;
}

// ─── Greenhouse form auto-filler ──────────────────────────────────────────────
//
// Responds to nr:greenhouse-fill CustomEvent from apply-card.js.
// Greenhouse (job-boards.greenhouse.io) uses:
//   • Plain inputs:  #first_name, #last_name, #email, #resume, #cover_letter
//   • intl-tel-input for phone (#phone, .iti__selected-country flag button)
//   • react-select (remix-css-* classes) for all dropdowns — opened via the
//     control div click, options appear as [class*="select__option"]
//   • Custom questions have job-specific numeric IDs; matched by label text.
//
// Real DOM confirmed from Remote.com Greenhouse job board (May 2026).

function _ghInput(idOrEl, value) {
  if (!value) return false;
  const el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return false;
  return _angularFillInput(el, value); // native setter trick works for React too
}

async function _ghReactSelect(containerEl, optionPattern) {
  // containerEl: any ancestor that contains the react-select (.select__control)
  if (!containerEl) return false;
  const control = containerEl.querySelector(
    '[class*="select__control"], .select__control',
  );
  if (!control) return false;
  control.click();
  await new Promise((r) => setTimeout(r, 320));
  // Options may render in a portal at body level or inside containerEl
  const opts = [
    ...document.querySelectorAll('[class*="select__option"]'),
    ...document.querySelectorAll('[role="option"]:not([aria-hidden="true"])'),
  ];
  const target = opts.find((o) => optionPattern.test(o.textContent?.trim() ?? ""));
  if (!target) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    return false;
  }
  target.click();
  await new Promise((r) => setTimeout(r, 200));
  return true;
}

// Country name → intl-tel-input ISO-2 code (data-country-code attr value)
const ITI_COUNTRY_CODES = {
  india: "in", "united states": "us", "united kingdom": "gb", canada: "ca",
  australia: "au", germany: "de", france: "fr", netherlands: "nl",
  ireland: "ie", singapore: "sg", "united arab emirates": "ae",
  japan: "jp", spain: "es", italy: "it", brazil: "br", "south africa": "za",
};

async function _ghFillPhone(phoneNumber, country) {
  if (!phoneNumber) return false;
  const countryName = country ?? "India";
  const iso = ITI_COUNTRY_CODES[countryName.toLowerCase()] ?? "in";
  const dialCode = PHONE_CODES[countryName.toLowerCase()] ?? "91";

  // 1. Set country flag via intl-tel-input
  const flagBtn = document.querySelector(".iti__selected-country");
  if (flagBtn) {
    flagBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const searchInput = document.querySelector(
      "#iti-0__search-input, .iti__search-input",
    );
    if (searchInput) {
      _angularFillInput(searchInput, countryName);
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 250));
    }
    const countryItem = document.querySelector(
      `li[data-country-code='${iso}'], #iti-0__item-${iso}`,
    );
    if (countryItem) {
      countryItem.click();
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  // 2. Fill the number itself (strip the matching country code if present)
  const stripRe = new RegExp(`^\\+?${dialCode}\\s*`);
  const num = phoneNumber.replace(stripRe, "").replace(/\D/g, "");
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    _angularFillInput(phoneInput, num || phoneNumber);
    return true;
  }
  return false;
}

async function _fillGreenhouseForm(profile, resumeBlob, coverLetterBlob) {
  const result = { filled: 0, skipped: 0, errors: [] };
  function hit(ok) { ok ? result.filled++ : result.skipped++; return ok; }

  // ── Basic identity fields ─────────────────────────────────────────────────
  const firstName = profile.first_name ?? (profile.full_name ?? "").split(" ")[0] ?? "";
  const lastName  = profile.last_name  ?? (profile.full_name ?? "").split(" ").slice(1).join(" ") ?? "";

  hit(_ghInput("first_name", firstName));
  hit(_ghInput("last_name", lastName));
  hit(_ghInput("email", profile.email));

  // Phone + country code flag
  if (profile.phone) {
    hit(await _ghFillPhone(profile.phone, profile.country));
  } else {
    result.skipped++;
  }

  // Country of residence (top-level react-select above the phone, id="country")
  const countryWrapper = document.querySelector(".phone-input__country .select");
  if (countryWrapper) {
    hit(await _ghReactSelect(countryWrapper, _countryPattern(profile.country)));
  } else {
    result.skipped++;
  }

  // Resume file upload (Greenhouse: <input id="resume" type="file">)
  const resumeInput = document.getElementById("resume");
  if (resumeBlob && resumeInput) {
    hit(_injectFile(resumeInput, resumeBlob, resumeBlob.filename ?? "nextrole_resume.doc"));
  } else {
    result.skipped++;
    if (!resumeBlob) result.errors.push("No resume available — upload one on your NextRole profile");
  }

  // Cover letter file upload (Greenhouse: <input id="cover_letter" type="file">)
  const coverLetterInput = document.getElementById("cover_letter");
  if (coverLetterBlob && coverLetterInput) {
    hit(_injectFile(coverLetterInput, coverLetterBlob, coverLetterBlob.filename ?? "cover_letter.pdf"));
  } else if (coverLetterInput && !coverLetterBlob) {
    // Form has a cover-letter input but user hasn't uploaded one
    result.skipped++;
  }

  // ── Custom questions — matched by label text ──────────────────────────────
  const fieldWrappers = [
    // Main application questions
    ...document.querySelectorAll(".application--questions .field-wrapper"),
    // Demographic section selects (each is wrapped in .select directly)
    ...document.querySelectorAll("#demographic-section .select__container"),
  ];

  for (const fw of fieldWrappers) {
    const labelEl  = fw.querySelector("label");
    const labelRaw = labelEl?.textContent ?? "";
    const label    = labelRaw.toLowerCase();
    if (!label) continue;

    const hasTextarea   = !!fw.querySelector("textarea");
    const hasPlainInput = !hasTextarea && !!fw.querySelector(
      "input:not([role='combobox']):not([type='hidden']):not([type='file'])",
    );
    const hasSelect     = !!fw.querySelector("input[role='combobox']");

    // ── Plain text inputs ─────────────────────────────────────────────────
    if (hasPlainInput) {
      const input = fw.querySelector(
        "input:not([role='combobox']):not([type='hidden']):not([type='file'])",
      );
      if (/linkedin/i.test(label)) {
        hit(_ghInput(input, profile.linkedin));
      } else {
        // Not something we can fill from profile
        result.skipped++;
      }
      continue;
    }

    // ── Textarea ─────────────────────────────────────────────────────────
    if (hasTextarea) {
      const ta = fw.querySelector("textarea");
      if (/portfolio.*link|portfolio.*url|portfolio.*password/i.test(label)) {
        hit(_ghInput(ta, profile.website ?? ""));
      } else {
        // Qualitative / open-ended — skip, needs manual or AI answer
        result.skipped++;
        if (/design system|contribution|example|describe|explain/i.test(label)) {
          result.errors.push(`Open-ended question requires manual answer: "${labelRaw.slice(0, 60)}…"`);
        }
      }
      continue;
    }

    // ── React-select dropdowns ────────────────────────────────────────────
    if (!hasSelect) continue;

    if (/how did you hear|how.*hear.*about|learn.*about.*remote|hear.*about.*us/i.test(label)) {
      hit(await _ghReactSelect(fw, /linkedin|naukri|job\s*board|online|internet|indeed|glassdoor|angel|referral/i));
    } else if (/country.*located|located.*country|which country|country.*plan|where.*work|country of residence/i.test(label)) {
      hit(await _ghReactSelect(fw, _countryPattern(profile.country)));
    } else if (/legally eligible|work eligibility|eligible to work|authoriz/i.test(label)) {
      // Answer YES unless user explicitly needs sponsorship
      const yes = profile.sponsorship_needed !== true;
      hit(await _ghReactSelect(fw, yes ? _YES_RE : _NO_RE));
    } else if (/require.*sponsor|need.*sponsor|sponsorship/i.test(label)) {
      // Inverted: YES means they need sponsorship
      hit(await _ghReactSelect(fw, profile.sponsorship_needed ? _YES_RE : _NO_RE));
    } else if (/allows you to work|work.*status|status.*allows|right to work/i.test(label)) {
      hit(await _ghReactSelect(fw, /citizen|permanent|domicile|right to work|visa/i));
    } else if (/willing.*relocat|reloca.*willing|open.*relocat/i.test(label)) {
      hit(await _ghReactSelect(fw, profile.willing_to_relocate !== false ? _YES_RE : _NO_RE));
    } else if (/non.?compete/i.test(label)) {
      hit(await _ghReactSelect(fw, _NO_RE));
    } else if (/pronoun/i.test(label)) {
      // Prefer explicit profile.pronouns; fall back to deriving from gender
      let pPat = _pronounsPattern(profile.pronouns);
      if (!pPat) {
        const g = (profile.gender ?? "").toLowerCase();
        pPat = g === "female" ? /she\s*[/\s]\s*her/i
             : g === "male"   ? /he\s*[/\s]\s*him/i
             : /prefer\s*not|they\s*[/\s]\s*them|not.*say|prefer to self/i;
      }
      hit(await _ghReactSelect(fw, pPat));
    } else if (/portfolio.*case study|case study.*portfolio/i.test(label)) {
      hit(await _ghReactSelect(fw, _YES_RE));
    } else if (/autonomously owned|own.*design.*process|owned.*design/i.test(label)) {
      hit(await _ghReactSelect(fw, _YES_RE));
    } else if (/design system/i.test(label)) {
      hit(await _ghReactSelect(fw, _YES_RE));
    } else if (/recording|brighthire|transcript.*interview|interview.*record/i.test(label)) {
      hit(await _ghReactSelect(fw, /\byes\b|i consent|consent/i));
    } else if (/privacy notice|privacy policy|california|ccpa|notice at collection/i.test(label)) {
      hit(await _ghReactSelect(fw, /i acknowledge|i accept|i agree|accept|agree|i have read/i));
    } else if (/consent.*self.?identif|self.?identif.*consent|confirm.*consent/i.test(label)) {
      hit(await _ghReactSelect(fw, /\byes\b|i consent|consent/i));
    } else if (/race|ethnicity/i.test(label)) {
      const racePat = _racePattern(profile.race_ethnicity) ?? /prefer.*not|decline|do\s*not\s*wish/i;
      hit(await _ghReactSelect(fw, racePat));
    } else if (/veteran|military/i.test(label)) {
      hit(await _ghReactSelect(fw, _veteranPattern(profile.veteran_status)));
    } else if (/gender/i.test(label) && !/non.?compete/i.test(label)) {
      const gPat = _genderPattern(profile.gender) ?? /prefer\s*not|decline|non.?binary/i;
      hit(await _ghReactSelect(fw, gPat));
    } else if (/lgbtq|lesbian|bisexual|queer|transgender/i.test(label)) {
      hit(await _ghReactSelect(fw, /prefer not|decline|i choose not|^\s*no\b/i));
    } else if (/disabilit/i.test(label)) {
      hit(await _ghReactSelect(fw, _disabilityPattern(profile.disability_status)));
    } else {
      result.skipped++;
    }
  }

  // ── GDPR / demographic data consent checkbox ──────────────────────────────
  const gdprBox = document.getElementById("gdpr_demographic_data_consent_given_1");
  if (gdprBox && !gdprBox.checked) {
    gdprBox.click();
    result.filled++;
  }

  return result;
}

// Helper: reconstruct a Blob from the plain-array data the SW sent us, and
// attach .filename for the injection helpers.
function _blobFromData(data) {
  if (!data?.data) return null;
  const blob = new Blob(
    [new Uint8Array(data.data)],
    { type: data.type ?? "application/octet-stream" },
  );
  blob.filename = data.filename ?? "file";
  return blob;
}

// ─── Tailor injection helpers ────────────────────────────────────────────────
//
// `tailorData` from the apply-card.js carries:
//   { answers: { cover_letter, why_company, about_yourself, experience,
//                additional_info }, experience_bullets, skills_to_emphasize }
//
// We inject the answer strings into matching freeform textareas on the page.
// Field-to-textarea matching reuses the existing classifyField() logic so a
// textarea labeled "Tell us about yourself" picks up answers.about_yourself.

function _injectTailorAnswers(tailorData) {
  if (!tailorData?.answers) return 0;
  const answers = tailorData.answers;
  let injected = 0;

  // Scan all textareas, classify, fill if we have a matching answer
  document.querySelectorAll("textarea").forEach((ta) => {
    if (ta.disabled || ta.readOnly || ta.value?.trim().length > 0) return;
    const meta = classifyField(ta);
    if (!meta || meta.kind !== "ai") return;
    const value = answers[meta.type];
    if (typeof value === "string" && value.trim()) {
      nativeFill(ta, value);
      injected++;
    }
  });

  return injected;
}

// ─── Lever form auto-filler ──────────────────────────────────────────────────
//
// jobs.lever.co/apply/<company>/<posting-id> — single-page form, React-based.
// Real DOM (confirmed across multiple Lever instances, 2025):
//   • Name/email/phone are plain text inputs with predictable name= attributes:
//       input[name="name"], input[name="email"], input[name="phone"],
//       input[name="org"]  (current company), input[name="urls[LinkedIn]"]
//   • Resume: <input name="resume" type="file"> inside .application-additional
//   • Cover letter: <textarea name="comments"> labeled "Additional information"
//     OR <input name="urls[Other]"> for portfolio link
//   • Custom questions live inside <ul class="application-question">
//   • EEO section is inside <div class="application-eeoc">
//   • "How did you hear about us?" → input[name="referrer"] (free text — Lever
//     doesn't normally show a dropdown for this)

function _leverInput(names, value) {
  if (!value) return false;
  const arr = Array.isArray(names) ? names : [names];
  for (const n of arr) {
    const el = document.querySelector(`input[name="${n}"], textarea[name="${n}"]`);
    if (el && _angularFillInput(el, value)) return true;
  }
  return false;
}

// Lever custom-question containers — find the input(s) inside a question whose
// label text matches the given regex.
function _leverFindQuestion(labelPattern) {
  // Try the explicit Lever container first, then fall back to any <ul>/<li>
  // that contains an application question label.
  const blocks = [
    ...document.querySelectorAll("ul.application-question, li.application-question, .application-question"),
  ];
  for (const block of blocks) {
    const lbl = block.querySelector("label, .application-label, h4, h5, legend");
    if (lbl && labelPattern.test(lbl.textContent?.trim() ?? "")) {
      return block;
    }
  }
  return null;
}

async function _fillLeverForm(profile, resumeBlob, coverLetterBlob) {
  const result = { filled: 0, skipped: 0, errors: [] };
  function hit(ok) { ok ? result.filled++ : result.skipped++; return ok; }

  // ── Identity & contact ────────────────────────────────────────────────────
  // Lever uses a single "name" field, not first/last
  hit(_leverInput("name",  profile.full_name));
  hit(_leverInput("email", profile.email));
  hit(_leverInput("phone", profile.phone));

  // Current company (org). Pull from most recent work experience if available.
  const lastJob = Array.isArray(profile.work_experience) && profile.work_experience.length > 0
    ? profile.work_experience[0]
    : null;
  hit(_leverInput("org",  lastJob?.company ?? ""));

  // Location — Lever's location field is sometimes a typeahead, sometimes plain
  hit(_leverInput(["location", "selectedLocation"], profile.city ?? profile.location));

  // ── Social / portfolio URLs ───────────────────────────────────────────────
  // Lever stores these in urls[Provider] format
  hit(_leverInput(["urls[LinkedIn]", "urls[linkedin]"], profile.linkedin));
  hit(_leverInput(["urls[GitHub]",   "urls[github]"],  profile.github));
  hit(_leverInput(["urls[Portfolio]","urls[Other]"],   profile.website));

  // ── Resume upload ─────────────────────────────────────────────────────────
  const resumeInput = document.querySelector('input[name="resume"][type="file"], input[type="file"][accept*="pdf"]');
  if (resumeInput && resumeBlob) {
    hit(_injectFile(resumeInput, resumeBlob, resumeBlob.filename ?? "resume.pdf"));
  } else if (!resumeBlob) {
    result.skipped++;
    result.errors.push("No resume uploaded — add one on your NextRole profile");
  } else {
    result.skipped++;
  }

  // ── Cover letter textarea / file ──────────────────────────────────────────
  // Lever names it "comments" (text) — file upload is rare on Lever
  const coverTa = document.querySelector('textarea[name="comments"], textarea[name="coverLetter"]');
  // Note: if tailor is enabled, _injectTailorAnswers() will fill this later
  // with AI content. For now we only inject the uploaded file if Lever offers
  // a file input.
  const coverFile = document.querySelector('input[name="coverLetter"][type="file"], input[type="file"][accept*="doc"]:not([name="resume"])');
  if (coverLetterBlob && coverFile) {
    hit(_injectFile(coverFile, coverLetterBlob, coverLetterBlob.filename ?? "cover_letter.pdf"));
  }
  // Don't auto-fill the comments textarea with anything here — tailoring will
  // handle it when enabled; otherwise leave for the user.
  void coverTa;

  // ── "How did you hear about us?" — input[name="referrer"] (free text) ────
  const referrer = document.querySelector('input[name="referrer"]');
  if (referrer && !referrer.value) {
    hit(_angularFillInput(referrer, "LinkedIn"));
  }

  // ── Custom questions — match by label text ────────────────────────────────
  // Work authorization
  {
    const block = _leverFindQuestion(/authoriz|eligible to work|right to work|legally/i);
    if (block) {
      // Could be select, radio, or input
      const sel = block.querySelector("select");
      const rad = block.querySelectorAll("input[type='radio']");
      const yes = profile.sponsorship_needed !== true;
      if (sel) {
        const opt = [...sel.options].find((o) => (yes ? _YES_RE : _NO_RE).test(o.text));
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); hit(true); }
        else hit(false);
      } else if (rad.length) {
        const want = [...rad].find((r) => (yes ? _YES_RE : _NO_RE).test(r.parentElement?.textContent ?? ""));
        if (want) { want.click(); hit(true); } else hit(false);
      } else result.skipped++;
    }
  }

  // Sponsorship needed (opposite question)
  {
    const block = _leverFindQuestion(/require.*sponsor|need.*sponsor|sponsorship/i);
    if (block) {
      const sel = block.querySelector("select");
      const rad = block.querySelectorAll("input[type='radio']");
      const yes = profile.sponsorship_needed === true;
      if (sel) {
        const opt = [...sel.options].find((o) => (yes ? _YES_RE : _NO_RE).test(o.text));
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); hit(true); }
        else hit(false);
      } else if (rad.length) {
        const want = [...rad].find((r) => (yes ? _YES_RE : _NO_RE).test(r.parentElement?.textContent ?? ""));
        if (want) { want.click(); hit(true); } else hit(false);
      } else result.skipped++;
    }
  }

  // Willingness to relocate
  {
    const block = _leverFindQuestion(/willing.*reloc|reloca.*willing|open.*reloca/i);
    if (block) {
      const sel = block.querySelector("select");
      const rad = block.querySelectorAll("input[type='radio']");
      const yes = profile.willing_to_relocate !== false;
      if (sel) {
        const opt = [...sel.options].find((o) => (yes ? _YES_RE : _NO_RE).test(o.text));
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); hit(true); }
        else hit(false);
      } else if (rad.length) {
        const want = [...rad].find((r) => (yes ? _YES_RE : _NO_RE).test(r.parentElement?.textContent ?? ""));
        if (want) { want.click(); hit(true); } else hit(false);
      }
    }
  }

  // ── EEO section (.application-eeoc) — gender, race, veteran, disability ──
  const eeoc = document.querySelector(".application-eeoc, fieldset.eeoc");
  if (eeoc) {
    const eeoFill = (pattern, optionPattern) => {
      const blocks = eeoc.querySelectorAll("ul, li, fieldset, div");
      for (const b of blocks) {
        const lbl = b.querySelector("label, legend, h4, h5");
        if (!lbl || !pattern.test(lbl.textContent ?? "")) continue;
        const sel = b.querySelector("select");
        if (sel) {
          const opt = [...sel.options].find((o) => optionPattern.test(o.text));
          if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); return true; }
        }
        const rads = b.querySelectorAll("input[type='radio']");
        for (const r of rads) {
          if (optionPattern.test(r.parentElement?.textContent ?? "")) { r.click(); return true; }
        }
        return false;
      }
      return false;
    };

    hit(eeoFill(/gender/i, _genderPattern(profile.gender) ?? /prefer.*not|decline/i));
    hit(eeoFill(/race|ethnicity/i, _racePattern(profile.race_ethnicity) ?? /prefer.*not|decline/i));
    hit(eeoFill(/veteran|military/i, _veteranPattern(profile.veteran_status)));
    hit(eeoFill(/disabilit/i, _disabilityPattern(profile.disability_status)));
  }

  return result;
}

// ─── Ashby form auto-filler ──────────────────────────────────────────────────
//
// jobs.ashbyhq.com/<company>/<posting-id>/application — single-page React form.
// Real DOM (confirmed from multiple Ashby instances, 2025):
//   • Inputs use _systemfield_ prefix: id="_systemfield_name", id="_systemfield_email"
//   • All inputs are tracked via React state; need native setter trick (we have
//     _angularFillInput which already does this)
//   • Resume: button click opens file picker — actual input is
//     input[type="file"][accept*="pdf"] (often hidden)
//   • Custom questions appear as <fieldset> blocks with <legend> for the label
//   • Select dropdowns are custom React components, not native <select>;
//     they have role="combobox" and listbox options with role="option"

function _ashbyInput(idOrNames, value) {
  if (!value) return false;
  const arr = Array.isArray(idOrNames) ? idOrNames : [idOrNames];
  for (const key of arr) {
    // Try id first, then name=, then aria-label
    const el = document.getElementById(key)
      ?? document.querySelector(`input[name="${key}"], textarea[name="${key}"]`)
      ?? document.querySelector(`input[aria-label*="${key}" i], textarea[aria-label*="${key}" i]`);
    if (el && _angularFillInput(el, value)) return true;
  }
  return false;
}

async function _ashbyDropdown(labelPattern, optionPattern) {
  // Ashby's "select" is a custom React combobox. Find the combobox whose label
  // matches, click it to open the listbox, then click the matching option.
  const fieldsets = [...document.querySelectorAll("fieldset, .ashby-application-form-question, div[role='group']")];
  for (const fs of fieldsets) {
    const lbl = fs.querySelector("legend, label, .ashby-application-form-field-label");
    if (!lbl || !labelPattern.test(lbl.textContent ?? "")) continue;

    // Custom combobox
    const combo = fs.querySelector("[role='combobox'], button[aria-haspopup='listbox']");
    if (combo) {
      combo.click();
      await new Promise((r) => setTimeout(r, 300));
      const opts = [...document.querySelectorAll("[role='option']:not([aria-hidden='true'])")];
      const target = opts.find((o) => optionPattern.test(o.textContent?.trim() ?? ""));
      if (target) { target.click(); await new Promise((r) => setTimeout(r, 150)); return true; }
      // Close listbox
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return false;
    }

    // Native select fallback
    const sel = fs.querySelector("select");
    if (sel) {
      const opt = [...sel.options].find((o) => optionPattern.test(o.text));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }

    // Radio group fallback
    const rads = fs.querySelectorAll("input[type='radio']");
    for (const r of rads) {
      if (optionPattern.test(r.parentElement?.textContent ?? "")) { r.click(); return true; }
    }
    return false;
  }
  return false;
}

async function _fillAshbyForm(profile, resumeBlob, coverLetterBlob) {
  const result = { filled: 0, skipped: 0, errors: [] };
  function hit(ok) { ok ? result.filled++ : result.skipped++; return ok; }

  // ── Identity & contact ────────────────────────────────────────────────────
  hit(_ashbyInput(["_systemfield_name", "name"], profile.full_name));
  hit(_ashbyInput(["_systemfield_email", "email"], profile.email));
  hit(_ashbyInput(["_systemfield_phone", "phoneNumber", "phone"], profile.phone));

  // Location
  hit(_ashbyInput(["_systemfield_location", "location"], profile.city ?? profile.location));

  // Social / portfolio URLs
  hit(_ashbyInput(["_systemfield_linkedin_url", "linkedin", "linkedinUrl"], profile.linkedin));
  hit(_ashbyInput(["_systemfield_github_url", "github", "githubUrl"], profile.github));
  hit(_ashbyInput(["_systemfield_website", "website", "portfolio"], profile.website));

  // ── Resume upload ─────────────────────────────────────────────────────────
  const resumeInput = document.querySelector(
    'input[type="file"][accept*="pdf"], input[type="file"][accept*="doc"], ' +
    'input[type="file"][name*="resume" i], input[type="file"]',
  );
  if (resumeInput && resumeBlob) {
    hit(_injectFile(resumeInput, resumeBlob, resumeBlob.filename ?? "resume.pdf"));
  } else if (!resumeBlob) {
    result.skipped++;
    result.errors.push("No resume uploaded — add one on your NextRole profile");
  }

  // Cover letter (file) — Ashby occasionally has a second file input
  if (coverLetterBlob) {
    const files = [...document.querySelectorAll('input[type="file"]')];
    const coverFile = files.find((inp) => {
      const ctx = `${inp.getAttribute("name") ?? ""} ${inp.getAttribute("aria-label") ?? ""} ${inp.closest("fieldset")?.textContent ?? ""}`.toLowerCase();
      return /cover|letter/.test(ctx);
    });
    if (coverFile) hit(_injectFile(coverFile, coverLetterBlob, coverLetterBlob.filename ?? "cover_letter.pdf"));
  }

  // ── Custom questions (dropdowns + radios) ────────────────────────────────
  // Work authorization
  hit(await _ashbyDropdown(
    /authoriz|eligible.*work|right.*work|legally/i,
    profile.sponsorship_needed === true ? _NO_RE : _YES_RE,
  ));

  // Sponsorship needed (inverted)
  hit(await _ashbyDropdown(
    /require.*sponsor|need.*sponsor|sponsorship/i,
    profile.sponsorship_needed === true ? _YES_RE : _NO_RE,
  ));

  // Country of residence
  if (profile.country) {
    hit(await _ashbyDropdown(/country.*residence|where.*located|which country/i, _countryPattern(profile.country)));
  }

  // Willing to relocate
  hit(await _ashbyDropdown(
    /willing.*reloc|reloca.*willing|open.*reloc/i,
    profile.willing_to_relocate !== false ? _YES_RE : _NO_RE,
  ));

  // "How did you hear about us?"
  hit(await _ashbyDropdown(
    /how.*hear|how.*learn|hear.*about|find.*role/i,
    /linkedin|naukri|job\s*board|online|internet|indeed|glassdoor|referral/i,
  ));

  // ── EEO / Demographics ──────────────────────────────────────────────────
  hit(await _ashbyDropdown(/gender/i, _genderPattern(profile.gender) ?? /prefer.*not|decline/i));
  hit(await _ashbyDropdown(/race|ethnicity/i, _racePattern(profile.race_ethnicity) ?? /prefer.*not|decline/i));
  hit(await _ashbyDropdown(/veteran|military/i, _veteranPattern(profile.veteran_status)));
  hit(await _ashbyDropdown(/disabilit/i, _disabilityPattern(profile.disability_status)));
  hit(await _ashbyDropdown(/pronoun/i, _pronounsPattern(profile.pronouns) ?? /prefer.*not|decline/i));

  return result;
}

// ─── Oracle HCM (JET) dedicated filler ──────────────────────────────────────
//
// Oracle HCM Cloud applications run at:
//   • fa-<env>.oraclecloud.com/hcmUI/...
//   • <company>.oracle.com/...apply...
//   • taleo.net (legacy Taleo, similar JET internals)
//
// The form uses Oracle JET web components:
//   • <oj-input-text>      → text/email/phone inputs (real <input> in Shadow DOM)
//   • <oj-text-area>       → textarea
//   • <oj-select-one>      → single-select (custom listbox)
//   • <oj-radioset>        → radio group
//   • <oj-checkboxset>     → checkbox group
//   • <oj-input-date>      → date picker
//   • <oj-file-picker>     → file upload
//
// Each oj-* element wraps a native input/select. classifyField() in this file
// already understands this (treats _nrOjHost as the label source). We extend
// that with Oracle-specific filling:
//   - Pierce shadow root once to find the actual fillable element
//   - Use Knockout-aware events (ojValueChanged) so the view-model updates
//   - Click oj-option items for select-one components

function _ojInputInside(ojEl) {
  if (!ojEl) return null;
  // Try light DOM first, then shadow root
  const light = ojEl.querySelector("input, textarea");
  if (light) return light;
  return ojEl.shadowRoot?.querySelector("input, textarea") ?? null;
}

function _ojFillByLabel(labelPattern, value) {
  if (!value) return false;
  const ojEls = [...document.querySelectorAll(
    "oj-input-text, oj-input-email, oj-input-password, oj-input-number, " +
    "oj-text-area, oj-text-field, oj-text-area-field"
  )];
  for (const ojEl of ojEls) {
    const label = (ojEl.getAttribute("label-hint")
      ?? ojEl.getAttribute("aria-label")
      ?? document.querySelector(`oj-label[for="${ojEl.id}"]`)?.textContent
      ?? "").trim();
    if (!label || !labelPattern.test(label)) continue;

    const inner = _ojInputInside(ojEl);
    if (!inner) continue;
    inner._nrOjHost = ojEl;          // mark so nativeFill fires ojValueChanged
    nativeFill(inner, value);
    return true;
  }
  return false;
}

async function _ojSelectOneByLabel(labelPattern, optionPattern) {
  const selects = [...document.querySelectorAll("oj-select-one, oj-combobox-one")];
  for (const sel of selects) {
    const label = (sel.getAttribute("label-hint")
      ?? sel.getAttribute("aria-label")
      ?? document.querySelector(`oj-label[for="${sel.id}"]`)?.textContent
      ?? "").trim();
    if (!label || !labelPattern.test(label)) continue;

    // Open the listbox — JET uses a button/role=combobox inside
    const trigger = sel.querySelector("[role='combobox'], button, .oj-select-arrow")
      ?? sel.shadowRoot?.querySelector("[role='combobox'], button");
    if (!trigger) continue;
    trigger.click();
    await new Promise((r) => setTimeout(r, 320));

    // JET options render as <oj-option> in a portal or inside the select
    const opts = [
      ...document.querySelectorAll("oj-option:not([aria-hidden='true'])"),
      ...document.querySelectorAll("[role='option']:not([aria-hidden='true'])"),
      ...document.querySelectorAll("li[role='option']"),
    ];
    const target = opts.find((o) => optionPattern.test(o.textContent?.trim() ?? ""));
    if (target) {
      target.click();
      await new Promise((r) => setTimeout(r, 200));
      return true;
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }
  return false;
}

async function _ojRadiosetByLabel(labelPattern, optionPattern) {
  const sets = [...document.querySelectorAll("oj-radioset")];
  for (const rs of sets) {
    const label = (rs.getAttribute("label-hint")
      ?? rs.getAttribute("aria-label")
      ?? document.querySelector(`oj-label[for="${rs.id}"]`)?.textContent
      ?? "").trim();
    if (!label || !labelPattern.test(label)) continue;

    const opts = [...rs.querySelectorAll("oj-option, input[type='radio']")];
    const target = opts.find((o) => {
      const t = o.textContent?.trim() ?? o.getAttribute("value") ?? "";
      return optionPattern.test(t);
    });
    if (target) {
      target.click();
      await new Promise((r) => setTimeout(r, 100));
      return true;
    }
  }
  return false;
}

async function _fillOracleHcmForm(profile, resumeBlob, coverLetterBlob) {
  const result = { filled: 0, skipped: 0, errors: [] };
  function hit(ok) { ok ? result.filled++ : result.skipped++; return ok; }

  // ── Identity & contact ────────────────────────────────────────────────────
  const firstName = profile.first_name ?? (profile.full_name ?? "").split(" ")[0];
  const lastName  = profile.last_name  ?? (profile.full_name ?? "").split(" ").slice(1).join(" ");

  hit(_ojFillByLabel(/first\s*name|given\s*name/i, firstName));
  hit(_ojFillByLabel(/last\s*name|family\s*name|surname/i, lastName));
  hit(_ojFillByLabel(/^\s*name\s*$|full\s*name/i, profile.full_name));
  hit(_ojFillByLabel(/email/i, profile.email));
  hit(_ojFillByLabel(/phone|mobile|cell/i, profile.phone));

  // ── Address ───────────────────────────────────────────────────────────────
  hit(_ojFillByLabel(/^address(?!.*line\s*2)|street\s*address|address\s*line\s*1/i, profile.street_address));
  hit(_ojFillByLabel(/city|locality/i, profile.city ?? profile.location));
  hit(_ojFillByLabel(/postal\s*code|zip|pin\s*code/i, profile.zip_postal));
  hit(_ojFillByLabel(/state|province|region/i, profile.state_province));

  // ── Country dropdown ──────────────────────────────────────────────────────
  if (profile.country) {
    hit(await _ojSelectOneByLabel(/country/i, _countryPattern(profile.country)));
  }

  // ── Social / portfolio URLs ───────────────────────────────────────────────
  hit(_ojFillByLabel(/linkedin/i, profile.linkedin));
  hit(_ojFillByLabel(/github/i,   profile.github));
  hit(_ojFillByLabel(/website|portfolio|personal\s*url/i, profile.website));

  // ── Work authorization / sponsorship (radio or select) ───────────────────
  const workAuthPattern = profile.sponsorship_needed === true ? _NO_RE : _YES_RE;
  if (!(await _ojSelectOneByLabel(/authoriz|eligible.*work|legally.*work|right.*work/i, workAuthPattern))) {
    await _ojRadiosetByLabel(/authoriz|eligible.*work|legally.*work|right.*work/i, workAuthPattern);
  }
  const sponsorPattern = profile.sponsorship_needed === true ? _YES_RE : _NO_RE;
  if (!(await _ojSelectOneByLabel(/require.*sponsor|need.*sponsor|sponsorship/i, sponsorPattern))) {
    await _ojRadiosetByLabel(/require.*sponsor|need.*sponsor|sponsorship/i, sponsorPattern);
  }

  // ── Relocation ────────────────────────────────────────────────────────────
  const reloc = profile.willing_to_relocate !== false ? _YES_RE : _NO_RE;
  await _ojSelectOneByLabel(/willing.*reloc|reloca.*willing|open.*reloc/i, reloc);

  // ── EEO / Demographics ────────────────────────────────────────────────────
  await _ojSelectOneByLabel(/gender/i,            _genderPattern(profile.gender)    ?? /prefer.*not|decline/i);
  await _ojSelectOneByLabel(/race|ethnicity/i,    _racePattern(profile.race_ethnicity) ?? /prefer.*not|decline/i);
  await _ojSelectOneByLabel(/veteran|military/i,  _veteranPattern(profile.veteran_status));
  await _ojSelectOneByLabel(/disabilit/i,         _disabilityPattern(profile.disability_status));

  // ── Resume upload — JET file picker exposes a native <input type=file> ────
  if (resumeBlob) {
    // First try oj-file-picker
    const ojFiles = [...document.querySelectorAll("oj-file-picker")];
    let resumeInput = null;
    for (const ojf of ojFiles) {
      const label = (ojf.getAttribute("label-hint") ?? ojf.getAttribute("aria-label") ?? "").toLowerCase();
      const inner = ojf.querySelector("input[type='file']") ?? ojf.shadowRoot?.querySelector("input[type='file']");
      if (inner && (/resume|cv\b|curric/.test(label) || !resumeInput)) resumeInput = inner;
    }
    // Fallback: any non-image file input on the page
    if (!resumeInput) {
      resumeInput = document.querySelector(
        'input[type="file"]:not([accept*="image"])'
      );
    }
    if (resumeInput && _injectFile(resumeInput, resumeBlob, resumeBlob.filename ?? "resume.pdf")) {
      result.filled++;
    } else {
      result.skipped++;
      result.errors.push("Resume input not found on this Oracle HCM page");
    }
  }

  // ── Cover-letter upload (rare in Oracle HCM) ─────────────────────────────
  if (coverLetterBlob) {
    const files = [...document.querySelectorAll('input[type="file"]')];
    const cover = files.find((inp) => {
      const ctx = `${inp.name} ${inp.getAttribute("aria-label") ?? ""} ${getFieldLabel(inp)}`.toLowerCase();
      return /cover|letter/.test(ctx);
    });
    if (cover) hit(_injectFile(cover, coverLetterBlob, coverLetterBlob.filename ?? "cover_letter.pdf"));
  }

  return result;
}

document.addEventListener("nr:oracle-fill", async (e) => {
  const { resumeData, coverLetterData, tailorData } = e.detail ?? {};
  const resumeBlob      = _blobFromData(resumeData);
  const coverLetterBlob = _blobFromData(coverLetterData);

  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};

  const results = await _fillOracleHcmForm(profile, resumeBlob, coverLetterBlob);

  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:oracle-fill-done", { detail: results }));
});

// ─── FAANG generic filler ────────────────────────────────────────────────────
//
// Amazon, Meta, Google, Apple, Microsoft each ship a different custom form.
// Without authoritative DOM access we lean on three universal observations:
//
//   1. Every accessible form labels its inputs (label[for], aria-label, etc.)
//      so classifyField()/classifySelectField() already recognise most fields.
//   2. Resume + cover letter upload via <input type=file>; cover letter, when
//      present, is the second non-image file input or one whose ctx contains
//      "cover"/"letter".
//   3. Yes/No questions for work-auth, sponsorship, relocation rely on label
//      keywords that we already handle in nativeFillSelect.
//
// We then layer company-specific overrides on top via the `overrides` arg:
//   { selectors: { firstName?, lastName?, ... }, beforeFill?, afterFill? }
//
// This approach gives Meta/Microsoft etc. a working baseline today; once we
// inspect their real DOM we can plug in tighter selectors without touching
// the core fill loop.

async function _fillFaangGeneric(profile, resumeBlob, coverLetterBlob, overrides = {}) {
  const result = { filled: 0, skipped: 0, errors: [] };
  function hit(ok) { ok ? result.filled++ : result.skipped++; return ok; }

  // Company-specific pre-fill hook (e.g. dismiss cookie banner, open a wizard)
  if (typeof overrides.beforeFill === "function") {
    try { await overrides.beforeFill(profile); } catch (e) { result.errors.push(`pre-hook: ${e.message}`); }
  }

  // ── 1. Targeted overrides (data-testid / specific IDs the company is known
  //       to use) — these run BEFORE the generic scan so any matched field is
  //       considered "already filled" and the scan skips it.
  const filledEls = new WeakSet();
  if (overrides.selectors) {
    const fillBy = (sel, value) => {
      if (!value) return false;
      const el = document.querySelector(sel);
      if (!el) return false;
      nativeFill(el, value);
      filledEls.add(el);
      return true;
    };
    const s = overrides.selectors;
    if (s.fullName)      hit(fillBy(s.fullName,    profile.full_name));
    if (s.firstName)     hit(fillBy(s.firstName,   profile.first_name ?? (profile.full_name ?? "").split(" ")[0]));
    if (s.lastName)      hit(fillBy(s.lastName,    profile.last_name  ?? (profile.full_name ?? "").split(" ").slice(1).join(" ")));
    if (s.email)         hit(fillBy(s.email,       profile.email));
    if (s.phone)         hit(fillBy(s.phone,       profile.phone));
    if (s.linkedin)      hit(fillBy(s.linkedin,    profile.linkedin));
    if (s.github)        hit(fillBy(s.github,      profile.github));
    if (s.portfolio)     hit(fillBy(s.portfolio,   profile.website));
    if (s.city)          hit(fillBy(s.city,        profile.city ?? profile.location));
    if (s.state)         hit(fillBy(s.state,       profile.state_province));
    if (s.zip)           hit(fillBy(s.zip,         profile.zip_postal));
    if (s.address)       hit(fillBy(s.address,     profile.street_address));
  }

  // ── 2. Generic label-driven scan & fill ─────────────────────────────────────
  const fields = scanFormFields();
  for (const f of fields) {
    if (filledEls.has(f.el)) continue;
    if (f.el.value && f.el.value.trim().length > 0) continue;

    if (f.meta.kind === "direct") {
      const value = getDirectValue(f.meta.type, profile);
      if (value) {
        nativeFill(f.el, value);
        result.filled++;
      } else {
        result.skipped++;
      }
    } else if (f.meta.kind === "select") {
      const ok = nativeFillSelect(f.el, f.meta, profile);
      ok ? result.filled++ : result.skipped++;
    }
    // kind === "ai" textareas are intentionally left for _injectTailorAnswers
  }

  // ── 3. Yes/No checkbox & radio groups (work-auth, sponsorship, relocation)
  // We look for fieldsets/legends or label-text near radio groups and click
  // the option matching the user's profile preference.
  const radioGroups = new Map();
  document.querySelectorAll('input[type="radio"]').forEach((r) => {
    const name = r.name;
    if (!name) return;
    if (!radioGroups.has(name)) radioGroups.set(name, []);
    radioGroups.get(name).push(r);
  });

  for (const [, radios] of radioGroups) {
    // Determine the question text from a nearby fieldset/legend
    const fs = radios[0].closest("fieldset, [role='radiogroup']");
    const legend = fs?.querySelector("legend, label, .question-label, h4, h5");
    const qText  = legend?.textContent?.toLowerCase() ?? radios[0].getAttribute("aria-label") ?? "";

    let wantPattern = null;
    if (/authoriz|eligible.*work|right.*work|legally/.test(qText)) {
      wantPattern = profile.sponsorship_needed === true ? _NO_RE : _YES_RE;
    } else if (/require.*sponsor|need.*sponsor|sponsorship/.test(qText)) {
      wantPattern = profile.sponsorship_needed === true ? _YES_RE : _NO_RE;
    } else if (/willing.*reloc|reloca.*willing|open.*reloc/.test(qText)) {
      wantPattern = profile.willing_to_relocate !== false ? _YES_RE : _NO_RE;
    } else if (/disabilit/.test(qText)) {
      wantPattern = _disabilityPattern(profile.disability_status);
    } else if (/veteran|military/.test(qText)) {
      wantPattern = _veteranPattern(profile.veteran_status);
    } else if (/gender/.test(qText) && profile.gender) {
      wantPattern = _genderPattern(profile.gender);
    }
    if (!wantPattern) continue;

    const target = radios.find((r) => {
      const lbl = r.closest("label")?.textContent
        ?? document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent
        ?? r.value
        ?? "";
      return wantPattern.test(lbl);
    });
    if (target) { target.click(); result.filled++; }
  }

  // ── 4. Resume file upload — first non-image file input ─────────────────────
  const allFileInputs = [...document.querySelectorAll('input[type="file"]')]
    .filter((inp) => !/image/.test(inp.getAttribute("accept") ?? ""));

  if (resumeBlob && allFileInputs.length > 0) {
    // Prefer one whose context mentions "resume"/"cv", else use the first
    const labeled = allFileInputs.find((inp) => {
      const ctx = `${inp.name} ${inp.getAttribute("aria-label") ?? ""} ${inp.id} ${getFieldLabel(inp)}`.toLowerCase();
      return /resume|cv\b|curric/.test(ctx);
    });
    const resumeInput = labeled ?? allFileInputs[0];
    if (_injectFile(resumeInput, resumeBlob, resumeBlob.filename ?? "resume.pdf")) {
      result.filled++;
    } else {
      result.skipped++;
    }

    // ── 5. Cover-letter file upload — second file input or labeled one ──────
    if (coverLetterBlob) {
      const coverInput = allFileInputs.find((inp) => {
        if (inp === resumeInput) return false;
        const ctx = `${inp.name} ${inp.getAttribute("aria-label") ?? ""} ${inp.id} ${getFieldLabel(inp)}`.toLowerCase();
        return /cover|letter/.test(ctx);
      }) ?? allFileInputs.find((inp) => inp !== resumeInput);

      if (coverInput && _injectFile(coverInput, coverLetterBlob, coverLetterBlob.filename ?? "cover_letter.pdf")) {
        result.filled++;
      }
    }
  } else if (resumeBlob) {
    result.errors.push("No file upload input found on this page");
  }

  // Company-specific post-fill hook
  if (typeof overrides.afterFill === "function") {
    try { await overrides.afterFill(profile, result); } catch (e) { result.errors.push(`post-hook: ${e.message}`); }
  }

  return result;
}

// ─── Per-company override registries ────────────────────────────────────────
// Real DOM patterns confirmed where noted; otherwise educated guess that the
// generic fallback will fix automatically when a tighter selector misses.

const FAANG_OVERRIDES = {
  amazon: {
    // amazon.jobs corporate apply: plain inputs with semantic name=
    selectors: {
      firstName: 'input[name="firstName"], input[name="first_name"], input#firstName',
      lastName:  'input[name="lastName"],  input[name="last_name"],  input#lastName',
      email:     'input[type="email"], input[name="email"], input#email',
      phone:     'input[type="tel"],   input[name="phone"], input[name="phoneNumber"]',
      address:   'input[name="address"], input[name="addressLine1"]',
      city:      'input[name="city"]',
      zip:       'input[name="postalCode"], input[name="zip"]',
    },
  },

  meta: {
    // Meta Careers uses data-testid extensively in their React app
    selectors: {
      firstName: '[data-testid="application_first_name"] input, input[name="firstName"]',
      lastName:  '[data-testid="application_last_name"] input,  input[name="lastName"]',
      email:     '[data-testid="application_email"] input,      input[type="email"]',
      phone:     '[data-testid="application_phone"] input,      input[type="tel"]',
      linkedin:  '[data-testid="application_linkedin"] input,   input[name*="linkedin" i]',
      github:    '[data-testid="application_github"] input,     input[name*="github" i]',
    },
  },

  google: {
    // careers.google.com — Material design components
    selectors: {
      firstName: 'input[aria-label*="First name" i], input[name="given-name"]',
      lastName:  'input[aria-label*="Last name" i],  input[name="family-name"]',
      email:     'input[type="email"], input[aria-label*="email" i]',
      phone:     'input[type="tel"],   input[aria-label*="phone" i]',
      city:      'input[aria-label*="city" i], input[aria-label*="location" i]',
    },
  },

  apple: {
    // jobs.apple.com — multi-step custom form
    selectors: {
      firstName: 'input[name="firstName"], input[id*="firstName" i]',
      lastName:  'input[name="lastName"],  input[id*="lastName"  i]',
      email:     'input[type="email"], input[name="email"], input[id*="email" i]',
      phone:     'input[type="tel"],   input[name*="phone" i]',
      city:      'input[name*="city" i], input[id*="city" i]',
      state:     'input[name*="state" i], select[name*="state" i]',
      zip:       'input[name*="postal" i], input[name*="zip" i]',
    },
  },

  microsoft: {
    // careers.microsoft.com — custom form. Microsoft offers a "Sign in with
    // LinkedIn to import" button that pre-fills; we don't use it (would
    // require OAuth) but we leave the form open for our fill.
    selectors: {
      firstName: 'input[name="firstName"], input[name*="first" i][type="text"]',
      lastName:  'input[name="lastName"],  input[name*="last"  i][type="text"]',
      email:     'input[type="email"], input[name="email"]',
      phone:     'input[type="tel"],   input[name*="phone" i]',
      linkedin:  'input[name*="linkedin" i], input[name*="profile" i]',
      city:      'input[name*="city" i]',
      country:   'select[name*="country" i]',
    },
  },
};

async function _fillFaangCompany(company, profile, resumeBlob, coverLetterBlob) {
  const overrides = FAANG_OVERRIDES[company] ?? {};
  return _fillFaangGeneric(profile, resumeBlob, coverLetterBlob, overrides);
}

// ─── FAANG fill handler (single event covers all 5 companies) ───────────────

document.addEventListener("nr:faang-fill", async (e) => {
  const { company, resumeData, coverLetterData, tailorData } = e.detail ?? {};
  const resumeBlob      = _blobFromData(resumeData);
  const coverLetterBlob = _blobFromData(coverLetterData);

  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};

  const results = await _fillFaangCompany(company ?? "amazon", profile, resumeBlob, coverLetterBlob);

  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:faang-fill-done", { detail: results }));
});

// ─── Google Forms filler ─────────────────────────────────────────────────────
//
// docs.google.com/forms/* — survey-style form. Each question is a list item:
//   [role="listitem"] > heading + answer-control
//
// Answer controls:
//   • Short text  → input.whsOnd / div[role="textbox"][contenteditable]
//   • Paragraph   → textarea
//   • Multi-choice→ div[role="radiogroup"] > div[role="radio"] (data-value=label)
//   • Checkboxes  → div[role="list"] > div[role="checkbox"] (data-answer-value)
//   • Dropdown    → div[role="listbox"] click → div[role="option"]
//   • Linear scale→ div[role="radio"] with data-value as number
//
// Profile mapping: we use classifyField-style label matching on the heading.

function _gfQuestionLabel(item) {
  return (
    item.querySelector('[role="heading"], .M7eMe, .HoXoMd')?.textContent?.trim() ?? ""
  );
}

function _gfMatchProfileValue(label, profile) {
  const lower = label.toLowerCase();
  for (const [type, patterns] of Object.entries(DIRECT_MAP)) {
    if (patterns.some((p) => p.test(lower))) {
      return getDirectValue(type, profile);
    }
  }
  return null;
}

async function _gfPickDropdown(listbox, optionPattern) {
  listbox.click();
  await new Promise((r) => setTimeout(r, 350));
  const opts = [...document.querySelectorAll('div[role="option"]:not([aria-hidden="true"])')];
  const target = opts.find((o) => optionPattern.test(o.textContent?.trim() ?? ""));
  if (!target) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }
  target.click();
  await new Promise((r) => setTimeout(r, 150));
  return true;
}

async function _fillGoogleForm(profile) {
  const result = { filled: 0, skipped: 0, errors: [] };
  const items = document.querySelectorAll('[role="listitem"]');

  for (const item of items) {
    const label = _gfQuestionLabel(item);
    if (!label) continue;

    // Text input (short answer)
    const textInput = item.querySelector('input[type="text"]:not([type="hidden"]), input.whsOnd');
    const editable  = item.querySelector('div[role="textbox"][contenteditable]');
    const textarea  = item.querySelector("textarea");
    const radioGrp  = item.querySelector('div[role="radiogroup"]');
    const checkGrp  = item.querySelector('div[role="list"]');
    const listbox   = item.querySelector('div[role="listbox"]');

    if (textInput || editable || textarea) {
      const val = _gfMatchProfileValue(label, profile);
      const el  = textInput ?? editable ?? textarea;
      if (val && el) {
        if (editable) {
          el.focus();
          el.textContent = val;
          el.dispatchEvent(new InputEvent("input", { bubbles: true, data: val }));
        } else {
          nativeFill(el, val);
        }
        result.filled++;
      } else {
        // AI-tailored textareas will be filled by _injectTailorAnswers later
        const isFreeform = /tell.*about.*yourself|why.*us|cover|describe|experience/i.test(label);
        if (!isFreeform) result.skipped++;
      }
      continue;
    }

    // Radio group — handle yes/no for sponsorship/relocate/work-auth + EEO
    if (radioGrp) {
      const radios = [...radioGrp.querySelectorAll('div[role="radio"]')];
      let want = null;
      if (/authoriz|eligible.*work|right.*work|legally/i.test(label))      want = profile?.sponsorship_needed === true ? _NO_RE : _YES_RE;
      else if (/require.*sponsor|need.*sponsor|sponsorship/i.test(label))   want = profile?.sponsorship_needed === true ? _YES_RE : _NO_RE;
      else if (/willing.*reloc|open.*reloc/i.test(label))                   want = profile?.willing_to_relocate !== false ? _YES_RE : _NO_RE;
      else if (/gender/i.test(label))                                       want = _genderPattern(profile?.gender);
      else if (/race|ethnicity/i.test(label))                               want = _racePattern(profile?.race_ethnicity);
      else if (/veteran|military/i.test(label))                             want = _veteranPattern(profile?.veteran_status);
      else if (/disabilit/i.test(label))                                    want = _disabilityPattern(profile?.disability_status);
      else if (/pronoun/i.test(label))                                      want = _pronounsPattern(profile?.pronouns);

      if (!want) { result.skipped++; continue; }

      const target = radios.find((r) => {
        const v = r.getAttribute("data-value") ?? r.getAttribute("aria-label") ?? r.parentElement?.textContent ?? "";
        return want.test(v);
      });
      if (target) { target.click(); result.filled++; }
      else result.skipped++;
      continue;
    }

    // Listbox (dropdown)
    if (listbox) {
      if (/country/i.test(label) && profile?.country) {
        if (await _gfPickDropdown(listbox, _countryPattern(profile.country))) result.filled++;
        else result.skipped++;
      } else if (/state|province/i.test(label) && profile?.state_province) {
        const pat = new RegExp(profile.state_province.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        if (await _gfPickDropdown(listbox, pat)) result.filled++;
        else result.skipped++;
      } else {
        result.skipped++;
      }
      continue;
    }

    // Checkbox list — used for "select all that apply" skill questions
    if (checkGrp && /skills?|technologies?|tools?/i.test(label) && Array.isArray(profile?.skills)) {
      const boxes = [...checkGrp.querySelectorAll('div[role="checkbox"]')];
      let ticked = 0;
      for (const skill of profile.skills.slice(0, 10)) {
        const re = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        const box = boxes.find((b) => {
          const v = b.getAttribute("data-answer-value") ?? b.parentElement?.textContent ?? "";
          return re.test(v) && b.getAttribute("aria-checked") !== "true";
        });
        if (box) { box.click(); ticked++; }
      }
      if (ticked > 0) result.filled++; else result.skipped++;
    }
  }

  return result;
}

document.addEventListener("nr:gforms-fill", async (e) => {
  const { tailorData } = e.detail ?? {};
  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};
  const results = await _fillGoogleForm(profile);

  if (tailorData) {
    // Google Forms uses contenteditable divs for paragraph answers — fill them
    // similarly to our generic _injectTailorAnswers but for contenteditable.
    const answers = tailorData.answers ?? {};
    const items = document.querySelectorAll('[role="listitem"]');
    let tailored = 0;
    for (const item of items) {
      const label = _gfQuestionLabel(item).toLowerCase();
      const editable = item.querySelector('div[role="textbox"][contenteditable], textarea');
      if (!editable || (editable.textContent ?? editable.value)?.trim()) continue;
      let v = null;
      for (const { type, pattern } of AI_MAP) {
        if (pattern.test(label) && answers[type]) { v = answers[type]; break; }
      }
      if (!v) continue;
      if (editable.tagName === "TEXTAREA") { nativeFill(editable, v); }
      else { editable.focus(); editable.textContent = v; editable.dispatchEvent(new InputEvent("input", { bubbles: true, data: v })); }
      tailored++;
    }
    if (tailored > 0) { results.filled += tailored; results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`); }
  }

  document.dispatchEvent(new CustomEvent("nr:gforms-fill-done", { detail: results }));
});

// ─── Microsoft Forms filler ──────────────────────────────────────────────────
//
// forms.office.com / forms.microsoft.com — survey-style. Each question:
//   [data-automation-id="questionItem"] contains:
//     • [data-automation-id="questionTitle"]  — label text
//     • [data-automation-id="textInput"] (input/textarea)
//     • [data-automation-id="choiceItem"]      — radio/checkbox items
//     • [data-automation-id="ratingItem"]      — Likert scale

async function _fillMicrosoftForm(profile) {
  const result = { filled: 0, skipped: 0, errors: [] };
  const items = document.querySelectorAll('[data-automation-id="questionItem"]');

  for (const item of items) {
    const label = item.querySelector('[data-automation-id="questionTitle"]')?.textContent?.trim() ?? "";
    if (!label) continue;
    const lower = label.toLowerCase();

    const textInput = item.querySelector('[data-automation-id="textInput"] input, [data-automation-id="textInput"] textarea, input[data-automation-id="textInput"], textarea[data-automation-id="textInput"]');
    if (textInput) {
      const val = _gfMatchProfileValue(label, profile);
      if (val) { nativeFill(textInput, val); result.filled++; }
      else result.skipped++;
      continue;
    }

    const choices = [...item.querySelectorAll('[data-automation-id="choiceItem"]')];
    if (choices.length > 0) {
      let want = null;
      if (/authoriz|eligible.*work/.test(lower))      want = profile?.sponsorship_needed === true ? _NO_RE : _YES_RE;
      else if (/require.*sponsor|sponsorship/.test(lower))  want = profile?.sponsorship_needed === true ? _YES_RE : _NO_RE;
      else if (/willing.*reloc/.test(lower))           want = profile?.willing_to_relocate !== false ? _YES_RE : _NO_RE;
      else if (/gender/.test(lower))                    want = _genderPattern(profile?.gender);
      else if (/race|ethnicity/.test(lower))            want = _racePattern(profile?.race_ethnicity);
      else if (/veteran/.test(lower))                   want = _veteranPattern(profile?.veteran_status);
      else if (/disabilit/.test(lower))                 want = _disabilityPattern(profile?.disability_status);

      if (!want) { result.skipped++; continue; }
      const target = choices.find((c) => want.test(c.textContent ?? ""));
      if (target) { target.click(); result.filled++; }
      else result.skipped++;
    }
  }

  return result;
}

document.addEventListener("nr:msforms-fill", async (e) => {
  const { tailorData } = e.detail ?? {};
  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};
  const results = await _fillMicrosoftForm(profile);

  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:msforms-fill-done", { detail: results }));
});

// ─── LinkedIn Easy Apply overlay filler ──────────────────────────────────────
//
// linkedin.com/jobs/* — when user clicks "Easy Apply", a modal opens:
//   • Modal: div[role="dialog"][aria-labelledby*="easy-apply"]
//   • Step header: h2[id*="easy-apply"]
//   • Multi-step: phone → resume → screening questions → review → submit
//   • Form fields: <input id="single-line-text-form-component-*">
//                  <select id="text-entity-list-form-component-*">
//   • "Next" / "Review" / "Submit application" buttons at modal footer
//
// We fill the current step's fields and STOP at the Review step — user must
// click Submit themselves (we never auto-submit).

function _liEasyApplyModal() {
  return document.querySelector(
    'div[role="dialog"][aria-labelledby*="easy-apply" i], ' +
    'div[role="dialog"][data-test-modal*="easy-apply" i], ' +
    'div.jobs-easy-apply-modal',
  );
}

async function _fillLinkedInEasyApply(profile, resumeBlob) {
  const result = { filled: 0, skipped: 0, errors: [] };
  const modal = _liEasyApplyModal();
  if (!modal) {
    result.errors.push("Easy Apply modal not open — click Easy Apply first");
    return result;
  }

  // ── Phone country code dropdown (first step often) ─────────────────────────
  const phoneCodeSel = modal.querySelector('select[id*="phoneNumber-country"], select[name*="country" i]');
  if (phoneCodeSel) {
    const opts = [...phoneCodeSel.options];
    const opt = opts.find((o) => _phoneCodePattern(profile.country).test(o.text));
    if (opt) {
      phoneCodeSel.value = opt.value;
      phoneCodeSel.dispatchEvent(new Event("change", { bubbles: true }));
      result.filled++;
    }
  }

  // ── Each form field in the modal: input + adjacent label ───────────────────
  const inputs = modal.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
  for (const el of inputs) {
    if (el.value && el.value !== "Select an option") continue;

    const labelText = getFieldLabel(el).toLowerCase();
    if (!labelText) continue;

    // Direct profile-matched text/numeric fields
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const val = _gfMatchProfileValue(labelText, profile);
      if (val) { nativeFill(el, val); result.filled++; continue; }

      // Years of experience question
      if (/years?.*experience/i.test(labelText) && profile.years_experience != null) {
        nativeFill(el, String(profile.years_experience));
        result.filled++;
        continue;
      }
      result.skipped++;
      continue;
    }

    // Selects — use the existing classifier + filler
    if (el.tagName === "SELECT") {
      const meta = classifySelectField(el);
      if (meta && nativeFillSelect(el, meta, profile)) { result.filled++; continue; }

      // Yes/No screening questions
      let want = null;
      if (/authoriz|eligible.*work/i.test(labelText)) want = profile.sponsorship_needed === true ? _NO_RE : _YES_RE;
      else if (/sponsor/i.test(labelText))             want = profile.sponsorship_needed === true ? _YES_RE : _NO_RE;
      else if (/reloca/i.test(labelText))              want = profile.willing_to_relocate !== false ? _YES_RE : _NO_RE;

      if (want) {
        const opt = [...el.options].find((o) => want.test(o.text));
        if (opt) {
          el.value = opt.value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          result.filled++;
          continue;
        }
      }
      result.skipped++;
    }
  }

  // ── Resume upload — LinkedIn Easy Apply step usually shows a resume picker
  // with an "Upload resume" button. The actual <input type=file> is hidden.
  if (resumeBlob) {
    const fileInput = modal.querySelector('input[type="file"]');
    if (fileInput) {
      if (_injectFile(fileInput, resumeBlob, resumeBlob.filename ?? "resume.pdf")) {
        result.filled++;
      } else {
        result.skipped++;
      }
    }
  }

  // NEVER auto-click Submit; user reviews the modal themselves.
  result.errors.push("ℹ Review the modal & click Next / Submit yourself");
  return result;
}

document.addEventListener("nr:linkedin-fill", async (e) => {
  const { resumeData, tailorData } = e.detail ?? {};
  const resumeBlob = _blobFromData(resumeData);
  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};
  const results = await _fillLinkedInEasyApply(profile, resumeBlob);

  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:linkedin-fill-done", { detail: results }));
});

// ─── Indeed Apply overlay filler ─────────────────────────────────────────────
//
// indeed.com/apply or apply.indeed.com — modal popup with a multi-step form.
// Indeed marks elements with data-tn-element + data-testid:
//   • Resume step: data-testid="resume-upload"
//   • Contact info: input#input-applicant\.name etc.
//   • Screening Qs: data-testid="questions-step"

async function _fillIndeedApply(profile, resumeBlob) {
  const result = { filled: 0, skipped: 0, errors: [] };

  // ── Identity (when on the contact-info step) ───────────────────────────────
  const f = (id, val) => {
    if (!val) return false;
    const el = document.getElementById(id) ?? document.querySelector(`input[name="${id}"]`);
    if (!el) return false;
    nativeFill(el, val);
    return true;
  };

  const firstName = profile.first_name ?? (profile.full_name ?? "").split(" ")[0];
  const lastName  = profile.last_name  ?? (profile.full_name ?? "").split(" ").slice(1).join(" ");

  if (f("input-applicant.name",         profile.full_name)) result.filled++;
  if (f("input-applicant.firstName",    firstName))         result.filled++;
  if (f("input-applicant.lastName",     lastName))          result.filled++;
  if (f("input-applicant.email",        profile.email))     result.filled++;
  if (f("input-applicant.phoneNumber",  profile.phone))     result.filled++;
  if (f("input-applicant.city",         profile.city ?? profile.location)) result.filled++;

  // ── Resume upload ──────────────────────────────────────────────────────────
  if (resumeBlob) {
    const fileInput = document.querySelector('input[type="file"][accept*="pdf"], input[type="file"][accept*="doc"], input[type="file"]');
    if (fileInput && _injectFile(fileInput, resumeBlob, resumeBlob.filename ?? "resume.pdf")) {
      result.filled++;
    }
  }

  // ── Screening questions: scan all visible textareas/inputs by label ───────
  const scanFields = scanFormFields();
  for (const f of scanFields) {
    if (f.el.value?.trim()) continue;
    if (f.meta.kind === "direct") {
      const val = getDirectValue(f.meta.type, profile);
      if (val) { nativeFill(f.el, val); result.filled++; }
    } else if (f.meta.kind === "select") {
      if (nativeFillSelect(f.el, f.meta, profile)) result.filled++;
    }
  }

  result.errors.push("ℹ Review & click Continue / Submit yourself");
  return result;
}

document.addEventListener("nr:indeed-fill", async (e) => {
  const { resumeData, tailorData } = e.detail ?? {};
  const resumeBlob = _blobFromData(resumeData);
  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};
  const results = await _fillIndeedApply(profile, resumeBlob);

  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:indeed-fill-done", { detail: results }));
});

document.addEventListener("nr:greenhouse-fill", async (e) => {
  const { resumeData, coverLetterData, tailorData } = e.detail ?? {};
  const resumeBlob      = _blobFromData(resumeData);
  const coverLetterBlob = _blobFromData(coverLetterData);

  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};

  const results = await _fillGreenhouseForm(profile, resumeBlob, coverLetterBlob);

  // After standard fill, inject any AI-tailored freeform answers
  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:greenhouse-fill-done", { detail: results }));
});

// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("nr:workday-fill", async (e) => {
  const { section, resumeData, coverLetterData, tailorData } = e.detail ?? {};
  const resumeBlob      = _blobFromData(resumeData);
  const coverLetterBlob = _blobFromData(coverLetterData);

  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};

  const results = await _fillWorkdaySection(section ?? "unknown", profile, resumeBlob, coverLetterBlob);

  // Inject tailored freeform answers (cover letter textarea, "Why us", etc.)
  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:workday-fill-done", { detail: results }));
});

// ─── Lever fill handler ──────────────────────────────────────────────────────

document.addEventListener("nr:lever-fill", async (e) => {
  const { resumeData, coverLetterData, tailorData } = e.detail ?? {};
  const resumeBlob      = _blobFromData(resumeData);
  const coverLetterBlob = _blobFromData(coverLetterData);

  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};

  const results = await _fillLeverForm(profile, resumeBlob, coverLetterBlob);

  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:lever-fill-done", { detail: results }));
});

// ─── Ashby fill handler ──────────────────────────────────────────────────────

document.addEventListener("nr:ashby-fill", async (e) => {
  const { resumeData, coverLetterData, tailorData } = e.detail ?? {};
  const resumeBlob      = _blobFromData(resumeData);
  const coverLetterBlob = _blobFromData(coverLetterData);

  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};

  const results = await _fillAshbyForm(profile, resumeBlob, coverLetterBlob);

  if (tailorData) {
    const tailored = _injectTailorAnswers(tailorData);
    results.filled += tailored;
    if (tailored > 0) results.errors.push(`✨ Tailored ${tailored} freeform answer${tailored !== 1 ? "s" : ""} with AI`);
  }

  document.dispatchEvent(new CustomEvent("nr:ashby-fill-done", { detail: results }));
});

document.addEventListener("nr:accenture-fill", async (e) => {
  const { stepNum, resumeData } = e.detail ?? {};

  // Reconstruct Blob from plain-array data (structured-clone safe transfer)
  let resumeBlob = null;
  if (resumeData?.data) {
    resumeBlob = new Blob(
      [new Uint8Array(resumeData.data)],
      { type: resumeData.type ?? "application/msword" },
    );
  }

  const profileRes = await new Promise((r) =>
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, r),
  );
  const profile = profileRes?.profile ?? {};

  const results = await _fillAccentureStep(stepNum ?? 0, profile, resumeBlob);
  document.dispatchEvent(new CustomEvent("nr:accenture-fill-done", { detail: results }));
});

})();
