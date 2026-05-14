/**
 * NextRole — ATS detection & form-structure registry.
 *
 * Single source of truth for: which ATS a page belongs to, whether the URL is
 * a JD or apply page, what selector pattern the form uses, and which filler
 * function handles it.
 *
 * Sourced from real-DOM inspection of each ATS (D:\Inspect Bundle). Updated
 * whenever a tenant variation is discovered — keep ATS_REGISTRY_VERSION in
 * sync so logged-in fillers can warn if the registry is older than the code.
 *
 * Exposed on window as window.NR_ATS_REGISTRY so content scripts loaded
 * later (auto-fill.js, apply-card.js, content.js) can read it without an
 * import. Must be loaded BEFORE those scripts in manifest.json content_scripts.
 */

const ATS_REGISTRY_VERSION = "1.0.0";

const NR_ATS_REGISTRY = {
  /* ─────────────────────────────────────────────────────────────────
   * Workday — covers genuine Workday tenants + Microsoft careers +
   * Netflix careers (both run on Workday under the hood). The same
   * fkit selectors work for all of them.
   * ─────────────────────────────────────────────────────────────── */
  workday: {
    label:     "Workday",
    family:    "workday",
    framework: "Workday fkit (React)",
    hosts: [
      /myworkdayjobs\.com$/i,
      /wd[0-9]+\.myworkdayjobs\.com$/i,
      /jobs\.careers\.microsoft\.com$/i,
      /jobs\.netflix\.com$/i,
      /explore\.jobs\.netflix\.net$/i,
    ],
    jdPattern:    /\/job\/[^/]+(?:\?|$|#)/,
    applyPattern: /\/(?:apply|applyManually|applyFlow)(?:\/|$|\?|#)/,
    formMarker:   '[data-automation-id="applyFlowPage"], [data-automation-id="progressBar"]',
    submitPattern: /\/(?:apply|applyManually|applyFlow)\/(?:complete|success)|\/application-submitted/i,
    submitMarker:  '[data-automation-id="applyFlowCompletePage"], [data-automation-id="applicationComplete"]',
    multiStep:    true,
    stepIndicator: '[data-automation-id="progressBarActiveStep"] label',
    fieldWrapper:  '[data-automation-id^="formField-"]',
    fields: {
      firstName: 'input[name="legalName--firstName"]',
      lastName:  'input[name="legalName--lastName"]',
      email:     'input[name="email"], [data-automation-id="formField-email"] input',
      phone:     'input[name="phoneNumber"]',
      phoneType: 'button[name="phoneType"]',
      address:   'input[name="addressLine1"]',
      city:      'input[name="city"]',
      country:   'button[name="country"]',
      linkedin:  'input[name="linkedInAccount"]',
      jobTitle:  '[data-fkit-id^="workExperience-"][data-fkit-id$="--jobTitle"] input',
      schoolName:'[data-fkit-id^="education-"][data-fkit-id$="--schoolName"] input',
    },
    fileUpload: {
      resume: 'input[data-automation-id="file-upload-input-ref"], [data-automation-id="attachments-FileUpload"] input[type="file"]',
      cover:  null,
    },
    nextButton: '[data-automation-id="pageFooterNextButton"]:not([aria-label*="Submit" i])',
    notes: "Microsoft (jobs.careers.microsoft.com) and Netflix (jobs.netflix.com / explore.jobs.netflix.net) also run on Workday. Walmart, Nvidia, Adobe, JPMC, Deloitte etc. are all genuine Workday tenants.",
    verified: ["walmart.wd5.myworkdayjobs.com", "nvidia.wd5.myworkdayjobs.com"],
  },

  /* ─────────────────────────────────────────────────────────────────
   * Greenhouse — modern (job-boards.) and classic (boards.) variants.
   * Single-page form. react-select for all dropdowns.
   * ─────────────────────────────────────────────────────────────── */
  greenhouse: {
    label:     "Greenhouse",
    family:    "greenhouse",
    framework: "React + react-select",
    hosts: [
      /(?:job-)?boards\.greenhouse\.io$/i,
      /grnh\.se$/i,
    ],
    jdPattern:    /\/jobs\/\d+/,
    applyPattern: /\/jobs\/\d+/,  // same URL — form is below JD on same page
    formMarker:   '#application-form, .application--form',
    submitMarker: '.application-confirmation, #application_confirmation, [data-qa="application-confirmation"]',
    multiStep:    false,
    stepIndicator: null,
    fieldWrapper:  '.field-wrapper, .input-wrapper',
    fields: {
      firstName: '#first_name',
      lastName:  '#last_name',
      email:     '#email',
      phone:     'input[type="tel"]',
      country:   '#country',
      linkedin:  null,  // custom Q, varies per tenant
    },
    fileUpload: {
      resume: '#resume',
      cover:  '#cover_letter',
    },
    phoneInput: { type: "intl-tel-input", searchSelector: '#iti-0__search-input' },
    nextButton: null,  // no Save & Continue — submit is final
    notes: "Single-page. All dropdowns are react-select (.select__control). Phone uses intl-tel-input. Demographics section is #demographic-section.",
    verified: ["job-boards.greenhouse.io/remotecom"],
  },

  /* ─────────────────────────────────────────────────────────────────
   * SuccessFactors — SAP SF and EY both use this. Tenant-uniform.
   * data-testid="sfTextField" wrappers, react-select dropdowns.
   * ─────────────────────────────────────────────────────────────── */
  successfactors: {
    label:     "SAP SuccessFactors",
    family:    "successfactors",
    framework: "SAP SuccessFactors / React",
    hosts: [
      /\.successfactors\.com$/i,
      /\.sapsf\.com$/i,
      /career[s]?\.ey\.com$/i,
    ],
    jdPattern:    /\/career\?jobId=|\/job\/|\/Career\.do/,
    applyPattern: /apply|jobSearch_ApplyEmail/,
    formMarker:   'input[data-testid="sfTextField"]',
    multiStep:    false,
    stepIndicator: null,
    fieldWrapper:  '[data-testid="sfTextField"]',
    fields: {
      firstName: 'input[data-testid="sfTextField"][name="firstName"]',
      lastName:  'input[data-testid="sfTextField"][name="lastName"]',
      email:     'input[data-testid="sfTextField"][name="email"]',
      phone:     'input[data-testid="sfTextField"][name="phone" i], input[data-testid="sfTextField"][name="cellPhone"]',
      city:      'input[data-testid="sfTextField"][name="city"]',
      country:   '#country, input[data-testid="sfTextField"][name="country"]',
      linkedin:  null,
    },
    fileUpload: {
      resume: 'input[type="file"][name*="resume" i], input[type="file"][name*="cv" i]',
      cover:  'input[type="file"][name*="cover" i]',
    },
    nextButton: null,
    notes: "EY and SAP both run on SuccessFactors with sfTextField selectors. SF tenants are typically large enterprises.",
    verified: ["ey.successfactors.com", "sapsf-tenant.successfactors.com"],
  },

  /* ─────────────────────────────────────────────────────────────────
   * Oracle HCM Cloud — Oracle JET widgets, Shadow DOM in places.
   * ─────────────────────────────────────────────────────────────── */
  oracle: {
    label:     "Oracle HCM Cloud",
    family:    "oracle",
    framework: "Oracle JET / Knockout",
    hosts: [
      /\.oraclecloud\.com$/i,
      /fa\.[a-z0-9]+\.oraclecloud\.com$/i,
      /\.oracle\.com$/i,
    ],
    jdPattern:    /\/hcmUI\/CandidateExperience.*jobId=/,
    applyPattern: /\/hcmUI\/CandidateExperience.*apply|application/i,
    formMarker:   '[data-bind-attr-id*="firstName"], oj-input-text',
    multiStep:    false,
    stepIndicator: null,
    fieldWrapper:  '.oj-form-control, oj-input-text',
    fields: {
      firstName: 'input[name="firstName"]',
      lastName:  'input[name="lastName"]',
      email:     'input[name="email"]',
      phone:     'input[name="phoneNumber"]',
      address:   'input[name="addressLine1"]',
      city:      'input[name="city"]',
      country:   'input[name="country"]',
    },
    fileUpload: {
      resume: 'input[type="file"][accept*="pdf" i]',
      cover:  null,
    },
    nextButton: null,
    notes: "Some fields are inside Shadow DOM — use _ojFillByLabel pattern from auto-fill.js. Cover letter uses cover-letter-upload-button web component.",
    verified: [],
  },

  /* ─────────────────────────────────────────────────────────────────
   * Amazon — multi-step custom React. Each step is a separate page.
   * ─────────────────────────────────────────────────────────────── */
  amazon: {
    label:     "Amazon Jobs",
    family:    "amazon",
    framework: "Custom React",
    hosts: [
      /amazon\.jobs$/i,
      /hiring\.amazon\.com$/i,
      /amazon\.dejobs\.org$/i,
    ],
    jdPattern:    /\/jobs\/\d+/,
    applyPattern: /\/application/,
    formMarker:   '[id^="RESUME"], #applicant_primary_phone_number',
    multiStep:    true,
    stepIndicator: '.progress-step.active, .progress-step--active',
    fieldWrapper:  '.question-form',
    fields: {
      firstName: 'input[name="firstName"], #applicant_first_name',
      lastName:  'input[name="lastName"], #applicant_last_name',
      email:     'input[name="email"], #applicant_email',
      phone:     '#applicant_primary_phone_number',
      country:   '.country-dropdown input',
    },
    fileUpload: {
      resume: 'input[type="file"]',
      cover:  null,
    },
    nextButton: null,
    notes: "Multi-step: Contact, General, Resume, Work pages. Each step is a separate URL. Custom widget set — no standard naming.",
    verified: [],
  },

  /* ─────────────────────────────────────────────────────────────────
   * Meta — custom React; Resume upload h2 marker.
   * ─────────────────────────────────────────────────────────────── */
  meta: {
    label:     "Meta Careers",
    family:    "meta",
    framework: "Custom React (xstyle classes)",
    hosts: [
      /metacareers\.com$/i,
      /careers\.meta\.com$/i,
      /facebook\.com\/careers/i,
    ],
    jdPattern:    /\/jobs\/\d+/,
    applyPattern: /\/jobs\/\d+\/apply|\/apply/,
    formMarker:   'h2:has-text("Resume upload"), [data-testid*="resume"]',  // approximate
    multiStep:    true,
    stepIndicator: null,
    fieldWrapper:  null,
    fields: {
      // Meta obfuscates classnames; rely on aria-label
      firstName: 'input[aria-label*="First" i]',
      lastName:  'input[aria-label*="Last" i]',
      email:     'input[type="email"]',
      phone:     'input[type="tel"]',
    },
    fileUpload: {
      resume: 'input[type="file"]',
      cover:  null,
    },
    nextButton: null,
    notes: "Highly obfuscated CSS — match by aria-label or role only.",
    verified: [],
  },

  /* ─────────────────────────────────────────────────────────────────
   * Infosys — Angular Material form. mat-form-field wrappers.
   * ─────────────────────────────────────────────────────────────── */
  infosys: {
    label:     "Infosys Careers",
    family:    "infosys",
    framework: "Angular + Material",
    hosts: [
      /career\.infosys\.com$/i,
      /digitalcareers\.infosys\.com$/i,
    ],
    jdPattern:    /\/jobs?\/|\/career/,
    applyPattern: /\/apply|\/application/,
    formMarker:   'mat-form-field, .mat-form-field',
    multiStep:    false,
    stepIndicator: null,
    fieldWrapper:  '.mat-form-field',
    fields: {
      phone:     '#phone',
      country:   'input[name="country_code"]',
    },
    fileUpload: {
      resume: 'input[type="file"][accept*="pdf"]',
      cover:  null,
    },
    nextButton: null,
    notes: "Angular Material patterns. Field labels are via mat-label inside mat-form-field. ng-c<hash> attributes vary per build.",
    verified: [],
  },

  /* ─────────────────────────────────────────────────────────────────
   * Lever / Ashby / iCIMS — common React ATSs (not in current
   * bundle but added for completeness based on existing code).
   * ─────────────────────────────────────────────────────────────── */
  lever: {
    label:     "Lever",
    family:    "lever",
    framework: "React (custom)",
    hosts: [/jobs\.lever\.co$/i, /lever\.co\/apply/i],
    jdPattern:    /\/[^/]+\/[a-f0-9-]+$/,
    applyPattern: /\/[^/]+\/[a-f0-9-]+\/apply/,
    formMarker:   '.application-question, input[name="resume"]',
    submitMarker: '.application-thank-you, [data-qa="application-thank-you"]',
    multiStep:    false,
    fields: {
      firstName: 'input[name="name"]',  // Lever uses combined name field
      email:     'input[name="email"]',
      phone:     'input[name="phone"]',
    },
    fileUpload: { resume: 'input[name="resume"]', cover: null },
    notes: "Single-page React form. Combined 'name' field instead of first/last.",
    verified: [],
  },

  ashby: {
    label:     "Ashby",
    family:    "ashby",
    framework: "React",
    hosts: [/jobs\.ashbyhq\.com$/i],
    jdPattern:    /\/[^/]+\/[a-f0-9-]+$/,
    applyPattern: /\/[^/]+\/[a-f0-9-]+\/application/,
    formMarker:   'input[id^="_systemfield_"], .ashby-application-form-question',
    submitMarker: '[data-testid="application-submitted"], .ashby-job-posting-success',
    multiStep:    false,
    fields: {
      firstName: 'input[id="_systemfield_name"]',  // approximate
      email:     'input[id="_systemfield_email"]',
    },
    fileUpload: { resume: 'input[type="file"]', cover: null },
    notes: "Modern React. Field ids use _systemfield_ prefix.",
    verified: [],
  },

  /* ─────────────────────────────────────────────────────────────────
   * Survey/overlay forms — Google Forms, Microsoft Forms.
   * Not strictly ATSs but companies sometimes use them.
   * ─────────────────────────────────────────────────────────────── */
  google_forms: {
    label:     "Google Forms",
    family:    "google_forms",
    framework: "Google Forms",
    hosts: [/docs\.google\.com\/forms/i, /forms\.gle$/i],
    jdPattern:    null,
    applyPattern: /.*/,  // anything that's a Google Form is an apply form
    formMarker:   '[role="listitem"][data-params]',
    multiStep:    false,
    notes: "Companies sometimes host applications on Google Forms. Per-question containers use role=listitem.",
  },

  ms_forms: {
    label:     "Microsoft Forms",
    family:    "ms_forms",
    framework: "Microsoft Forms",
    hosts: [/forms\.office\.com$/i, /forms\.microsoft\.com$/i],
    jdPattern:    null,
    applyPattern: /.*/,
    formMarker:   '[data-automation-id="questionItem"]',
    multiStep:    false,
    notes: "Some companies use MS Forms for application.",
  },

  /* ─────────────────────────────────────────────────────────────────
   * Easy-apply overlays — LinkedIn modal, Indeed Apply.
   * ─────────────────────────────────────────────────────────────── */
  linkedin: {
    label:     "LinkedIn Easy Apply",
    family:    "linkedin",
    framework: "LinkedIn",
    hosts: [/linkedin\.com$/i],
    jdPattern:    /\/jobs\/view\//,
    applyPattern: /easy-apply|\/jobs\/view\//,  // modal opens on the JD page
    formMarker:   '[data-test-modal-id="easy-apply-modal"], [aria-labelledby*="easy-apply" i]',
    multiStep:    true,
    notes: "Easy Apply opens as a modal — no URL change. Must detect modal DOM marker.",
  },

  indeed: {
    label:     "Indeed Apply",
    family:    "indeed",
    framework: "Indeed",
    hosts: [/apply\.indeed\.com$/i, /smartapply\.indeed\.com$/i, /indeed\.com$/i],
    jdPattern:    /\/viewjob/,
    applyPattern: /\/apply|smartapply/,
    formMarker:   '[data-testid="ia-AppCard"]',
    multiStep:    true,
    notes: "Indeed often redirects to smartapply.indeed.com; some employers proxy through their own ATS.",
  },

  /* ─────────────────────────────────────────────────────────────────
   * Naukri — Indian market. Q&A chatbot pattern.
   * ─────────────────────────────────────────────────────────────── */
  naukri: {
    label:     "Naukri",
    family:    "naukri",
    framework: "Custom (chatbot)",
    hosts: [/naukri\.com$/i],
    jdPattern:    /\/job-listings-|\/jobs\//,
    applyPattern: /apply|chatbot/,
    formMarker:   "#chatbot-container",
    multiStep:    true,
    notes: "Conversational Q&A — chatbot asks one question at a time. NextRole shows values for copy-paste rather than autofilling.",
  },
};

/* ─────────────────────────────────────────────────────────────────
 * Resolver helpers
 * ───────────────────────────────────────────────────────────────── */

/** Find the registry entry whose hosts pattern matches the current location. */
function detectATSFromHost(hostname = location.hostname) {
  for (const [key, entry] of Object.entries(NR_ATS_REGISTRY)) {
    if (entry.hosts?.some((re) => re.test(hostname))) return { key, entry };
  }
  return null;
}

/** Is the current URL the JD page (not the application form)? */
function isJDPage(entry, url = location.href) {
  if (!entry?.jdPattern) return false;
  if (entry.applyPattern && entry.applyPattern.test(url) && !entry.applyPattern.toString().includes(".*")) {
    return false;  // apply pattern matches → not JD
  }
  return entry.jdPattern.test(url);
}

/** Is the current URL the application form page? */
function isApplyPage(entry, url = location.href) {
  if (!entry?.applyPattern) return false;
  return entry.applyPattern.test(url);
}

/** Is the page DOM showing an apply form (regardless of URL)? */
function hasApplyFormDOM(entry) {
  if (!entry?.formMarker) return false;
  try { return !!document.querySelector(entry.formMarker); }
  catch { return false; }
}

function detectSubmittedState(entry, url = location.href) {
  if (!entry) return false;
  if (entry.submitPattern?.test?.(url)) return true;
  if (!entry.submitMarker) return false;
  try { return !!document.querySelector(entry.submitMarker); }
  catch { return false; }
}

// Expose to other content scripts loaded after this one
window.NR_ATS_REGISTRY = NR_ATS_REGISTRY;
window.NR_ATS_REGISTRY_VERSION = ATS_REGISTRY_VERSION;
window.NR_ATS = { detectATSFromHost, isJDPage, isApplyPage, hasApplyFormDOM, detectSubmittedState };
