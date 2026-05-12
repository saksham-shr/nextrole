/**
 * NextRole content script
 * Runs on every page at document_idle.
 * Extracts job posting data and responds to popup requests.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function text(selector, root = document) {
  return root.querySelector(selector)?.innerText?.trim() ?? null;
}

function texts(selectors, root = document) {
  for (const s of selectors) {
    const t = root.querySelector(s)?.innerText?.trim();
    if (t) return t;
  }
  return null;
}

function attr(selector, attribute, root = document) {
  return root.querySelector(selector)?.getAttribute(attribute)?.trim() ?? null;
}

function metaContent(name) {
  return (
    attr(`meta[name="${name}"]`, "content") ??
    attr(`meta[property="${name}"]`, "content") ??
    null
  );
}

function cleanText(str, maxLen = 10000) {
  if (!str) return "";
  return str.replace(/\s{3,}/g, "\n\n").trim().slice(0, maxLen);
}

// Pick the longer of two strings (prefers the full DOM description over truncated)
function longer(a, b) {
  if (!a) return b ?? "";
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

function companyFromDomain() {
  const host = location.hostname.replace(/^www\./, "");
  const parts = host.split(".");
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

// ─── Extractor 1: JSON-LD schema.org/JobPosting ───────────────────────────────

function fromJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const el of scripts) {
    try {
      let data = JSON.parse(el.textContent);
      // @type can be a string OR an array — handle both
      const isJobPosting = (d) => [].concat(d?.["@type"] ?? []).includes("JobPosting");
      if (Array.isArray(data)) data = data.find(isJobPosting) ?? null;
      if (data?.["@graph"]) data = data["@graph"].find(isJobPosting) ?? null;
      if (!data || !isJobPosting(data)) continue;

      const title = data.title ?? data.name ?? null;
      const company = data.hiringOrganization?.name ?? data.hiringOrganization ?? null;
      const ldDesc = typeof data.description === "string"
        ? cleanText(data.description.replace(/<[^>]+>/g, " "))
        : null;

      // Require a real description — listing pages embed JobPosting schemas with no/short descriptions
      if (title && ldDesc && ldDesc.length > 150) {
        return { title, company: company ?? companyFromDomain(), description: ldDesc, confidence: "high", source: "schema.org" };
      }
    } catch {}
  }
  return null;
}

// ─── Extractor 2: LinkedIn ────────────────────────────────────────────────────

function fromLinkedIn() {
  if (!location.hostname.includes("linkedin.com")) return null;
  // Job detail pages (/jobs/view/) AND search/collections right-panels (?currentJobId=)
  const isJobView  = location.pathname.includes("/jobs/view/");
  const isJobPanel = /[?&]currentJobId=\d+/.test(location.search) &&
    (location.pathname.startsWith("/jobs/") || location.pathname.startsWith("/feed"));
  if (!isJobView && !isJobPanel) return null;

  const title = texts([
    // Right-side panel (search / collections) uses h2 inside the unified top card
    ".job-details-jobs-unified-top-card__job-title h2",
    ".job-details-jobs-unified-top-card__job-title h1",
    ".job-details-jobs-unified-top-card__job-title",
    ".jobs-unified-top-card__job-title h2",
    "h2.jobs-unified-top-card__job-title",
    "h1.t-24.t-bold",
    ".topcard__title",
    "h1",
  ]);

  const company = texts([
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".job-details-jobs-unified-top-card__primary-description-without-tagline a",
    // Panel view on search pages
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    ".topcard__flavor--black-link",
    '[data-tracking-control-name="public_jobs_topcard-org-name"]',
  ]);

  // LinkedIn truncates with .show-more-less-html — grab both variants and pick longer.
  // Also handles the right-side panel on search/collections pages (.jobs-search__job-details).
  const descA = texts([
    ".show-more-less-html__markup--more",   // expanded state
    ".show-more-less-html__markup",          // any state
    ".jobs-description__content",
    ".jobs-description-content__text",
    ".description__text",
    ".job-details-module__content",
  ]);
  const descEl =
    document.querySelector(".jobs-box__html-content") ??
    document.querySelector(".jobs-description-content__text") ??
    document.querySelector(".jobs-search__job-details--container .jobs-description") ??
    document.querySelector(".jobs-description");
  const descB = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;
  const description = longer(descA, descB);

  if (title && company) {
    return { title, company, description: cleanText(description), confidence: "high", source: "linkedin" };
  }
  return null;
}

// ─── Extractor 3: Indeed ──────────────────────────────────────────────────────

function fromIndeed() {
  if (!location.hostname.includes("indeed.com")) return null;

  const title = texts([
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    ".jobsearch-JobInfoHeader-title",
    "h1.icl-u-xs-mb--xs",
    "h1",
  ]);

  const company = texts([
    '[data-testid="inlineHeader-companyName"] a',
    '[data-testid="inlineHeader-companyName"]',
    ".jobsearch-InlineCompanyRating-companyHeader a",
    '[data-company-name]',
  ]);

  const description = texts([
    "#jobDescriptionText",
    ".jobsearch-JobComponent-description",
    '[id*="job-description"]',
  ]);

  if (title && description) {
    return { title, company: company ?? companyFromDomain(), description: cleanText(description), confidence: "high", source: "indeed" };
  }
  return null;
}

// ─── Extractor 4: Glassdoor ───────────────────────────────────────────────────

function fromGlassdoor() {
  if (!location.hostname.includes("glassdoor.com")) return null;

  const title = texts([
    '[data-test="job-title"]',
    '[class*="JobDetails_jobTitle"]',
    ".job-title",
    "h1",
  ]);

  const company = texts([
    '[data-test="employer-name"]',
    '[class*="JobDetails_companyName"]',
    '[class*="EmployerProfile_employerName"]',
    ".employer-name",
  ]);

  const descEl =
    document.querySelector('[class*="JobDetails_jobDescription"]') ??
    document.querySelector('[class*="jobDescriptionContent"]') ??
    document.querySelector('[class*="jobDescription"]') ??
    document.querySelector('[class*="description__Content"]') ??
    document.querySelector(".desc");

  // Glassdoor often has full HTML — strip tags for plain text
  const description = descEl
    ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " "))
    : null;

  if (title && description) {
    return { title, company: company ?? companyFromDomain(), description, confidence: "high", source: "glassdoor" };
  }
  return null;
}

// ─── Extractor 5: Lever ───────────────────────────────────────────────────────

function fromLever() {
  // ATS lives at jobs.lever.co — lever.co itself is the product marketing site
  if (location.hostname !== "jobs.lever.co") return null;
  // Detail pages have /company/job-uuid — listing pages only have /company
  const pathParts = location.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2) return null;

  const title = texts([
    "[data-qa='posting-name']",
    ".posting-headline h2",
    "h2",
    "h1",
  ]);

  const company = pathParts[0]
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1).replace(/-/g, " ")
    : companyFromDomain();

  // Lever: combine all sections for full JD
  const sections = [...document.querySelectorAll(".posting-description, .section-wrapper .section, .posting-requirements")];
  const description = sections.length
    ? cleanText(sections.map((el) => el.innerText).join("\n\n"))
    : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "lever" };
  }
  return null;
}

// ─── Extractor 6: Greenhouse ──────────────────────────────────────────────────

function fromGreenhouse() {
  // ATS is at boards.greenhouse.io — greenhouse.io itself is the product site
  if (
    !location.hostname.includes("boards.greenhouse.io") &&
    !location.hostname.includes("grnh.se")
  ) return null;
  // Detail pages: /company/jobs/12345 — listing pages: /company
  if (location.hostname.includes("boards.greenhouse.io")) {
    const parts = location.pathname.split("/").filter(Boolean);
    if (!parts.some((p) => /^\d+$/.test(p)) && !location.pathname.includes("/jobs/")) return null;
  }

  const title = texts([
    ".app-title",
    "#header h1",
    "h1.section-header__title",
    "h1",
  ]);

  const company = texts([".company-name", ".logo-text"]) ?? (() => {
    const m = location.hostname.match(/^(.+)\.greenhouse\.io$/);
    if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : null;
  })();

  const descEl = document.querySelector("#content") ??
    document.querySelector(".section--text") ??
    document.querySelector("#application");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company: company ?? companyFromDomain(), description, confidence: "high", source: "greenhouse" };
  }
  return null;
}

// ─── Extractor 7: Ashby ───────────────────────────────────────────────────────

function fromAshby() {
  if (!location.hostname.includes("ashbyhq.com")) return null;
  // Detail pages: /company/role-slug — listing pages: /company
  const pathParts = location.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2) return null;

  const title = texts([
    "h1",
    ".ashby-job-posting-heading",
    '[class*="jobPosting"] h1',
  ]);

  const company = pathParts[0]
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1).replace(/-/g, " ")
    : companyFromDomain();

  const descEl = document.querySelector(".ashby-job-posting-brief-description") ??
    document.querySelector('[class*="posting-description"]') ??
    document.querySelector('[class*="jobPosting"] main') ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "ashby" };
  }
  return null;
}

// ─── Extractor 8: Workday ─────────────────────────────────────────────────────

function fromWorkday() {
  // workday.com is the product website — only myworkdayjobs.com is the ATS
  if (!location.hostname.includes("myworkdayjobs.com")) return null;

  const title = texts([
    '[data-automation-id="jobPostingHeader"]',
    '[data-automation-id="jobPostingHeader"] h1',
    '[data-automation-id="jobPostingHeader"] h2',
    "h2[data-automation-id]",
    "h1",
  ]);

  // Workday URLs: <tenant>.wd1.myworkdayjobs.com or <tenant>.myworkdayjobs.com
  // og:site_name always returns "Workday" (the platform), not the employer — never use it.
  // The tenant subdomain is the most reliable company identifier.
  const wdSubMatch = location.hostname.match(/^([^.]+)\.(?:wd\d+\.)?myworkdayjobs\.com$/i);
  const companyFromSub = wdSubMatch
    ? wdSubMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const company =
    companyFromSub ??
    text('[data-automation-id="breadcrumb-row"] a') ??
    texts(['[data-automation-id="legalEntityName"]', '.css-1cjz7xt']) ??
    companyFromDomain();

  const descEl =
    document.querySelector('[data-automation-id="jobPostingDescription"]') ??
    document.querySelector('[data-automation-id="job-posting-description"]') ??
    document.querySelector('[class*="jobPostingDescription"]') ??
    document.querySelector('[class*="job-description"]');
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "workday" };
  }
  return null;
}

// ─── Extractor 9: SmartRecruiters ────────────────────────────────────────────

function fromSmartRecruiters() {
  if (!location.hostname.includes("smartrecruiters.com")) return null;

  const title = texts(["h1[itemprop='title']", ".job-title", "h1"]);
  const company = texts(["[itemprop='hiringOrganization'] [itemprop='name']", ".company-name"]) ?? companyFromDomain();

  const descEl = document.querySelector("[itemprop='description']") ?? document.querySelector(".job-description");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "smartrecruiters" };
  }
  return null;
}

// ─── Extractor 10: Workable ───────────────────────────────────────────────────

function fromWorkable() {
  if (!location.hostname.includes("workable.com")) return null;

  const title = texts(["[data-ui='job-title']", "h1.posting-title", "h1"]);
  const company = texts(["[data-ui='company-name']", ".company-name"]) ?? companyFromDomain();

  const descEl = document.querySelector("[data-ui='job-description']") ?? document.querySelector(".job-description");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "workable" };
  }
  return null;
}

// ─── Extractor 11: Wellfound / AngelList ─────────────────────────────────────

function fromWellfound() {
  if (!location.hostname.includes("wellfound.com") && !location.hostname.includes("angel.co")) return null;

  const title = texts(["h1", '[class*="JobListing"] h2']);
  const company = texts(['[class*="startupName"]', '[class*="company-name"]']) ?? companyFromDomain();

  const descEl = document.querySelector('[class*="job-description"]') ?? document.querySelector('[class*="description"]');
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title && description) {
    return { title, company, description, confidence: "high", source: "wellfound" };
  }
  return null;
}

// ─── Extractor 12: Naukri ────────────────────────────────────────────────────

function fromNaukri() {
  if (!location.hostname.includes("naukri.com")) return null;

  // Precise selectors confirmed from real DOM (job-listings pages)
  const title =
    attr('[class*="jd-header-title"]', "title") ||
    texts([
      '[class*="jd-header-title"]',
      '[class*="job-tittle"] h1',
      '[class*="jobTitle"]',
      'h1',
    ]);

  const company = texts([
    '[class*="jd-header-comp-name"] a',   // exact class from real DOM
    '[class*="comp-name"] a',
    '[class*="comp-name"]',
    '[class*="company-name"]',
    '[class*="companyName"]',
  ]) ?? companyFromDomain();

  // Prefer the rich inner-html description block; fall back to section
  const descEl =
    document.querySelector('[class*="dang-inner-html"]') ??
    document.querySelector('[class*="job-desc"]') ??
    document.querySelector('[class*="jobDesc"]') ??
    document.querySelector('[class*="job-description"]') ??
    document.querySelector("section.job-desc");
  const description = descEl ? cleanText(descEl.innerText) : null;

  // Extract Naukri job ID from URL slug (12-digit numeric suffix)
  const jobIdMatch = location.href.match(/job-listings-.*?-(\d{10,14})(?:[?#]|$)/);
  const naukriJobId = jobIdMatch?.[1] ?? null;

  if (title) {
    return {
      title, company, description,
      confidence: "high", source: "naukri",
      siteJobId: naukriJobId,          // stable ID for JD→apply tracking
      applyMode: naukriApplyMode(),    // "redirect" | "chatbot" | "unknown"
    };
  }
  return null;
}

// Detect which apply mode Naukri will use for this job
function naukriApplyMode() {
  // Chatbot panel is already open
  const chatbot = document.querySelector("#chatbot-container");
  if (chatbot && chatbot.children.length > 0) return "chatbot";
  // No strong signal yet — will be updated after user clicks Apply
  return "unknown";
}

// ─── Extractor 13: Accenture Careers ─────────────────────────────────────────

function fromAccenture() {
  if (!location.hostname.includes("accenture.com")) return null;
  if (!location.pathname.includes("/careers/jobdetails")) return null;

  const params = new URLSearchParams(location.search);

  // Title: prefer URL query param, fall back to DOM h1
  const rawTitle = params.get("title");
  const title = rawTitle
    ? rawTitle.replace(/\+/g, " ")
    : document.querySelector("h1")?.textContent?.trim() ?? null;

  const accentureJobId = params.get("id") ?? null;

  const descEl =
    document.querySelector('[class*="job-desc"]') ??
    document.querySelector('[class*="description"]') ??
    document.querySelector("main");
  const description = descEl
    ? descEl.innerText?.trim() ?? null
    : null;

  if (title) {
    return {
      title,
      company: "Accenture",
      description,
      confidence: "high",
      source: "accenture",
      siteJobId: accentureJobId,
    };
  }
  return null;
}

// ─── Extractor 14: iCIMS ─────────────────────────────────────────────────────

function fromICIMS() {
  if (!location.hostname.includes("icims.com")) return null;

  const title = texts([
    ".iCIMS_JobTitle h1",
    ".iCIMS_Header h1",
    '[class*="iCIMS_Header"] h1',
    "h1",
  ]);

  const company = metaContent("og:site_name") ?? companyFromDomain();

  const descEl =
    document.querySelector(".iCIMS_JobContent") ??
    document.querySelector("#iCIMS_Content") ??
    document.querySelector('[class*="job-description"]') ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "icims" };
  }
  return null;
}

// ─── Extractor 14: BambooHR ──────────────────────────────────────────────────

function fromBambooHR() {
  if (!location.hostname.includes("bamboohr.com")) return null;
  if (!location.pathname.includes("/careers") && !location.pathname.includes("/jobs")) return null;

  const title = texts([
    ".BambooHR-ATS-item-title h2",
    ".BambooHR-ATS-item-title",
    ".jopPosition h1",
    "h1",
    "h2",
  ]);

  const company = metaContent("og:site_name") ?? companyFromDomain();

  const descEl =
    document.querySelector(".BambooHR-ATS-body") ??
    document.querySelector('[class*="job-description"]') ??
    document.querySelector(".jopDescription") ??
    document.querySelector("#description") ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "bamboohr" };
  }
  return null;
}

// ─── Extractor 15: Taleo (Oracle Recruiting, legacy) ─────────────────────────

function fromTaleo() {
  if (!location.hostname.includes("taleo.net")) return null;

  const title = texts([
    "h1.jobTitle",
    ".requisitionDetails h1",
    "[id*='reqTitle']",
    "[id*='jobTitle']",
    "[class*='requisitionTitle']",
    "[class*='req-title']",
    "[data-automation-id='requisition-title']",
    "h1",
  ]) ?? (() => {
    // Taleo often puts "Job Title - Company - Taleo" in the page title
    const parts = document.title.split(/\s[-–—|]\s/).map((s) => s.trim()).filter(Boolean);
    return (parts[0] && parts[0].length < 120) ? parts[0] : null;
  })();

  const company =
    metaContent("og:site_name") ??
    metaContent("application-name") ??
    (() => {
      const parts = document.title.split(/\s[-–—|]\s/).map((s) => s.trim()).filter(Boolean);
      return parts.length > 1 ? parts[1] : null;
    })() ??
    companyFromDomain();

  const descEl =
    document.querySelector(".jd-info") ??
    document.querySelector("#description") ??
    document.querySelector('[class*="requisition-description"]') ??
    document.querySelector('[class*="jobDescription"]') ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "taleo" };
  }
  return null;
}

// ─── Extractor 15b: Oracle Recruiting Cloud (ORC / HCM) ──────────────────────
// URLs: [company].fa.[region].oraclecloud.com/hcmUI/CandidateExperience/...

function fromOracleCloud() {
  if (
    !location.hostname.includes("oraclecloud.com") ||
    (!location.pathname.includes("/hcmUI/") && !location.pathname.includes("/CandidateExperience/"))
  ) return null;

  // On apply/section pages the h1 is the form-section header (e.g. "Contact Information"),
  // not the job title. Use DOM selectors only on non-apply pages; always fall back to
  // the document title which Oracle sets to "Job Title | Company | Oracle Recruiting Cloud".
  const isApplyPage = /\/apply\//i.test(location.pathname);

  const titleFromDom = isApplyPage ? null : texts([
    '[data-bind*="Title"]',
    '[class*="job-requisition-title"]',
    '[class*="JobRequisitionTitle"]',
    '[class*="JobTitle"]',
    '[class*="jobTitle"]',
    '.oj-panel h1',
    'h1',
  ]);

  // Page title: "Advanced Software Engineer - hybrid | Apply | Honeywell | Oracle..."
  // Split on | — but only once; separator may also be · or —
  const pageTitleParts = document.title.split(/\s*[|·—]\s*/).map((s) => s.trim()).filter(Boolean);
  const titleFromPage = (pageTitleParts[0] && pageTitleParts[0].length < 120) ? pageTitleParts[0] : null;

  const title = titleFromDom ?? titleFromPage;

  // ── Company ─────────────────────────────────────────────────────────────────
  // Priority 1: URL path /sites/{Company}/jobs/…  (e.g. /sites/Honeywell/jobs/…)
  const siteMatch = location.pathname.match(/\/sites\/([^/]+)\//i);
  const companyFromPath = siteMatch
    ? decodeURIComponent(siteMatch[1]).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  // Priority 2: DOM selectors (job-detail page)
  const companyFromDom = isApplyPage ? null : texts([
    '[data-bind*="OrganizationName"]',
    '[class*="company-name"]',
    '[class*="companyName"]',
  ]);

  // Priority 3: page title second segment (may be company name on detail pages)
  const companyFromTitle = pageTitleParts.length > 1 ? pageTitleParts[pageTitleParts.length - 2] : null;

  // Priority 4: subdomain — but skip if it looks like a random tenant ID
  //   Tenant IDs are short alphanumeric strings (e.g. "ibqbjb", "fa12xyz").
  //   Real company subdomains tend to be recognisable words.
  const subMatch = location.hostname.match(/^([^.]+)\.fa\./);
  const subCandidate = subMatch ? subMatch[1] : null;
  const subLooksLikeCompany = subCandidate && subCandidate.length > 3 && /[a-z]{4,}/i.test(subCandidate);
  const companyFromSub = subLooksLikeCompany
    ? subCandidate.charAt(0).toUpperCase() + subCandidate.slice(1).replace(/-/g, " ")
    : null;

  const company = companyFromPath ?? companyFromDom ?? companyFromTitle ?? companyFromSub ?? companyFromDomain();

  const descEl =
    document.querySelector('[data-bind*="description"]') ??
    document.querySelector('[class*="jobDescription"]') ??
    document.querySelector('[class*="job-description"]') ??
    document.querySelector('[class*="requisitionDescription"]') ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "oracle" };
  }
  return null;
}

// ─── Extractor 16: JazzHR ────────────────────────────────────────────────────

function fromJazzHR() {
  if (
    !location.hostname.includes("applytojob.com") &&
    !location.hostname.includes("jazz.co")
  ) return null;

  const title = texts([
    "h1.position-title",
    "h2.position-title",
    ".header-company-and-position h2",
    "h1",
  ]);

  const company =
    texts([".company-name", ".header-company-name"]) ??
    metaContent("og:site_name") ??
    companyFromDomain();

  const descEl =
    document.querySelector(".job-description") ??
    document.querySelector(".position-description") ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "jazzhr" };
  }
  return null;
}

// ─── Extractor 17: Recruitee ─────────────────────────────────────────────────

function fromRecruitee() {
  if (!location.hostname.includes("recruitee.com")) return null;

  const title = texts([
    "h1[data-ui='job-name']",
    ".job-header h1",
    "h1",
  ]);

  const company = metaContent("og:site_name") ?? companyFromDomain();

  const descEl =
    document.querySelector("[data-ui='job-description']") ??
    document.querySelector(".job-description") ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "recruitee" };
  }
  return null;
}

// ─── Extractor 18: Breezy HR ─────────────────────────────────────────────────

function fromBreezyHR() {
  if (!location.hostname.includes("breezy.hr")) return null;

  const title = texts([
    "h1.position-title",
    ".header h1",
    "h1",
  ]);

  const company =
    texts([".company-name", ".header .company"]) ??
    metaContent("og:site_name") ??
    companyFromDomain();

  const descEl =
    document.querySelector(".description") ??
    document.querySelector(".position-description") ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "breezyhr" };
  }
  return null;
}

// ─── Extractor 19: Jobvite ────────────────────────────────────────────────────

function fromJobvite() {
  if (!location.hostname.includes("jobvite.com")) return null;

  const title = texts([
    "h1.jv-job-detail-name",
    ".jv-header-job-title",
    ".jv-job-title",
    "h1",
  ]);

  const company =
    texts([".jv-company-name", ".jv-header-company-name"]) ??
    metaContent("og:site_name") ??
    companyFromDomain();

  const descEl =
    document.querySelector(".jv-job-detail-description") ??
    document.querySelector(".jv-job-description") ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "jobvite" };
  }
  return null;
}

// ─── Extractor 20: Teamtailor ─────────────────────────────────────────────────

function fromTeamtailor() {
  if (!location.hostname.includes("teamtailor.com")) return null;

  const title = texts([
    "h1.job-title",
    ".job-header h1",
    "h1",
  ]);

  const company =
    texts([".company-name", ".header__title-company"]) ??
    metaContent("og:site_name") ??
    companyFromDomain();

  const descEl =
    document.querySelector(".job-body") ??
    document.querySelector(".job-content") ??
    document.querySelector('[class*="description"]') ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "teamtailor" };
  }
  return null;
}

// ─── Extractor 21: Personio ──────────────────────────────────────────────────

function fromPersonio() {
  if (
    !location.hostname.includes("personio.com") &&
    !location.hostname.includes("personio.de")
  ) return null;

  const title = texts([
    "h1.jd-title",
    ".job-listing-head h1",
    ".job-title",
    "h1",
  ]);

  const company = metaContent("og:site_name") ?? companyFromDomain();

  const descEl =
    document.querySelector(".jd-description") ??
    document.querySelector(".job-listing-body") ??
    document.querySelector(".job-description") ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "personio" };
  }
  return null;
}

// ─── Extractor 22: SAP SuccessFactors ────────────────────────────────────────

function fromSAPSuccessFactors() {
  if (
    !location.hostname.includes("successfactors.com") &&
    !location.hostname.includes("sapsf.com") &&
    !location.hostname.includes("career.sap.com") &&
    !location.hostname.includes("jobs.sap.com")
  ) return null;

  const title = texts([
    "[data-compid='jobReqTitle']",
    ".jobReqHeader h1",
    "[class*='jobTitle'] h1",
    "[class*='job-title'] h1",
    "h1",
  ]);

  const company =
    texts(["[data-compid='jobDetailCompanyName']", ".companyName", "[class*='companyName']"]) ??
    (() => {
      // SAP SF URL: /careers/<companyId>/job/<jobId>/...
      const m = location.pathname.match(/\/careers\/([^/?#]+)/);
      return m ? decodeURIComponent(m[1]).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;
    })() ??
    metaContent("og:site_name") ??
    companyFromDomain();

  const descEl =
    document.querySelector("[data-compid='jobDescriptionTxt']") ??
    document.querySelector(".jobDescriptionTxt") ??
    document.querySelector("[class*='jobDescription']") ??
    document.querySelector("[class*='job-description']") ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "sap_sf" };
  }
  return null;
}

// ─── Extractor 23: Heuristic fallback (any job site) ─────────────────────────
//
// Stricter than before: we now require BOTH the URL signal AND at least one
// additional signal (content OR DOM).  This prevents false positives on
// blog posts, pricing pages, and company homepages that merely mention
// "compensation" or have an "Apply" CTA somewhere on the page.

function fromHeuristic() {
  const title = document.querySelector("h1")?.innerText?.trim() ?? null;
  if (!title || title.length > 160) return null;

  // Pick the best content container
  const contentEl =
    document.querySelector('[class*="job-desc"]')    ??
    document.querySelector('[id*="job-desc"]')        ??
    document.querySelector('[class*="jobDesc"]')      ??
    document.querySelector('[class*="job-detail"]')   ??
    document.querySelector('[class*="jobDetail"]')    ??
    document.querySelector('[class*="description"]')  ??
    document.querySelector("article")                 ??
    document.querySelector("main")                    ??
    document.querySelector('[role="main"]')            ??
    document.body;

  const contentText = contentEl?.innerText ?? "";

  // Signal A: URL contains job-related path segments (REQUIRED)
  // Anything without a job-like URL is almost certainly a false positive.
  const JOB_URL = /\/job[s]?\/|\/career[s]?\/|\/vacancy|\/vacancies|\/position[s]?\/|\/opening[s]?\/|\/recruit|\/job-post|job[-_]listing|viewjob|jobdetail|requisition/i;
  if (!JOB_URL.test(location.href) && !JOB_URL.test(document.title)) return null;

  // Signal B: job-specific content terms (at least 2 distinct keywords needed)
  const JOB_KEYWORDS = [
    /responsibilities/i, /requirements/i, /qualifications/i,
    /what you.ll do/i, /about the role/i, /job description/i,
    /we are looking for/i, /you will/i, /years of experience/i,
  ];
  const contentMatches = JOB_KEYWORDS.filter((re) => re.test(contentText)).length;

  // Signal C: structural DOM clues specific to job pages
  const JOB_DOM = !!(
    document.querySelector('[class*="job-title"], [class*="jobTitle"], [class*="job-role"]') ??
    document.querySelector('button[class*="apply"], a[class*="apply-now"], [id*="apply-btn"]')
  );

  // Need URL signal (already checked) + at least content match OR DOM clue
  if (contentMatches < 1 && !JOB_DOM) return null;

  const company =
    metaContent("og:site_name") ??
    metaContent("application-name") ??
    text('[itemtype="http://schema.org/Organization"] [itemprop="name"]') ??
    companyFromDomain();

  return { title, company, description: cleanText(contentText, 8000), confidence: "low", source: "heuristic" };
}

// ─── Main extraction ──────────────────────────────────────────────────────────

function extractJob() {
  const result =
    fromJsonLd() ??
    fromLinkedIn() ??
    fromIndeed() ??
    fromGlassdoor() ??
    fromLever() ??
    fromGreenhouse() ??
    fromAshby() ??
    fromWorkday() ??
    fromSmartRecruiters() ??
    fromWorkable() ??
    fromWellfound() ??
    fromNaukri() ??
    fromAccenture() ??
    fromICIMS() ??
    fromBambooHR() ??
    fromOracleCloud() ??   // before Taleo — ORC is current Oracle product
    fromTaleo() ??
    fromJazzHR() ??
    fromRecruitee() ??
    fromBreezyHR() ??
    fromJobvite() ??
    fromTeamtailor() ??
    fromPersonio() ??
    fromSAPSuccessFactors() ??
    fromHeuristic();

  if (!result) return null;

  // If JSON-LD gave a short description but the DOM has more, patch it
  if (result.source === "schema.org" && (!result.description || result.description.length < 500)) {
    const domDesc = texts([
      ".job-description", "#job-description", '[class*="job-description"]',
      "article", "main",
    ]);
    if (domDesc && domDesc.length > (result.description?.length ?? 0)) {
      result.description = cleanText(domDesc);
    }
  }

  return { ...result, url: location.href, page_title: document.title };
}

// ─── Floating detection card (Panel A + B) ───────────────────────────────────

function injectCardStyles() {
  if (document.getElementById("nr-card-styles")) return;
  const s = document.createElement("style");
  s.id = "nr-card-styles";
  s.textContent = `
    #nr-detect-card {
      position: fixed;
      bottom: 24px; right: 24px;
      z-index: 2147483647;
      width: 300px;
      background: #fffdf8;
      border: 1px solid #e0d8d0;
      border-radius: 10px;
      box-shadow: 0 12px 32px rgba(42,38,32,0.16);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px; color: #1a1814;
      overflow: hidden;
      animation: nr-card-in 0.22s ease;
    }
    @keyframes nr-card-in {
      from { transform: translateY(12px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    #nr-detect-card .nr-ch {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 12px;
      background: #c84a1f; color: #fffdf8;
    }
    #nr-detect-card .nr-ch-plain {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 12px;
      border-bottom: 1px solid #e0d8d0;
    }
    #nr-detect-card .nr-brand {
      display: flex; align-items: center; gap: 6px;
      font-size: 10px; font-family: monospace;
      letter-spacing: 0.1em; text-transform: uppercase;
    }
    #nr-detect-card .nr-cx {
      background: none; border: none;
      color: rgba(255,253,248,0.7); cursor: pointer;
      font-size: 16px; line-height: 1; padding: 2px 4px; border-radius: 4px;
    }
    #nr-detect-card .nr-cx-plain {
      background: none; border: none;
      color: #9a9286; cursor: pointer;
      font-size: 16px; line-height: 1; padding: 2px 4px; border-radius: 4px;
    }
    #nr-detect-card .nr-cx:hover { color: #fffdf8; }
    #nr-detect-card .nr-cx-plain:hover { color: #1a1814; }
    #nr-detect-card .nr-cb { padding: 12px; }
    #nr-detect-card .nr-title {
      font-weight: 600; font-size: 13.5px; margin-bottom: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nr-detect-card .nr-company {
      color: #6b6358; font-size: 12px; margin-bottom: 12px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nr-detect-card .nr-url {
      font-family: monospace; font-size: 10.5px; color: #9a9286;
      margin-bottom: 12px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nr-detect-card .nr-actions { display: flex; gap: 6px; }
    #nr-detect-card .nr-eval-first-btn {
      width: 100%; margin-bottom: 6px;
      padding: 8px 12px; border-radius: 8px;
      border: 1.5px solid rgba(200,74,31,0.45);
      background: rgba(200,74,31,0.06);
      color: #c84a1f; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      display: flex; align-items: center; justify-content: center; gap: 5px;
      transition: background 0.15s, border-color 0.15s;
    }
    #nr-detect-card .nr-eval-first-btn:hover:not(:disabled) {
      background: rgba(200,74,31,0.12); border-color: #c84a1f;
    }
    #nr-detect-card .nr-eval-first-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #nr-detect-card .nr-btn {
      flex: 1; padding: 8px 10px; border-radius: 7px; border: none;
      font-family: monospace; font-size: 10px; font-weight: 500;
      letter-spacing: 0.1em; text-transform: uppercase;
      cursor: pointer; transition: opacity 0.14s; display: flex;
      align-items: center; justify-content: center; gap: 5px;
    }
    #nr-detect-card .nr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #nr-detect-card .nr-btn:hover:not(:disabled) { opacity: 0.84; }
    #nr-detect-card .nr-primary { background: #c84a1f; color: #fffdf8; }
    #nr-detect-card .nr-secondary { background: #f0ebe3; color: #2a2620; }
    #nr-detect-card .nr-ghost {
      flex: unset; width: 100%; padding: 7px 10px; border-radius: 7px;
      border: 1px solid #e0d8d0; background: transparent; color: #6b6358;
    }
    #nr-detect-card .nr-dismiss {
      font-size: 10px; font-family: monospace; color: #9a9286;
      margin-top: 8px; text-align: center;
    }
    #nr-detect-card .nr-dismiss-bar {
      height: 2px; background: #e0d8d0; border-radius: 1px;
      margin-top: 8px; overflow: hidden;
    }
    #nr-detect-card .nr-dismiss-bar-fill {
      height: 100%; background: #c84a1f;
      transition: width 1s linear;
    }
    /* minimized state — only header visible */
    #nr-detect-card.nr-minimized { width: auto; min-width: 160px; }
    #nr-detect-card.nr-minimized .nr-cb { display: none; }
    #nr-detect-card .nr-minimize {
      background: none; border: none;
      color: rgba(255,253,248,0.6); cursor: pointer;
      font-size: 16px; line-height: 1; padding: 2px 5px; border-radius: 4px;
    }
    #nr-detect-card .nr-minimize:hover { color: #fffdf8; }
    #nr-detect-card .nr-minimize-plain {
      background: none; border: none;
      color: #9a9286; cursor: pointer;
      font-size: 16px; line-height: 1; padding: 2px 5px; border-radius: 4px;
    }
    #nr-detect-card .nr-minimize-plain:hover { color: #1a1814; }

    /* saved confirmation row */
    #nr-detect-card .nr-saved-row {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 11px; border-radius: 7px;
      background: #edf7ee; margin-bottom: 12px;
    }
    #nr-detect-card .nr-saved-check {
      width: 18px; height: 18px; border-radius: 50%;
      background: #2f7a3a; color: #fff;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 11px;
    }
    /* action row buttons in Panel B */
    #nr-detect-card .nr-action-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 11px; border-radius: 7px;
      border: 1px solid #e0d8d0; margin-bottom: 7px; cursor: pointer;
      transition: border-color 0.14s, background 0.14s;
    }
    #nr-detect-card .nr-action-row:hover { border-color: #c84a1f; background: #fdf6f3; }
    #nr-detect-card .nr-action-row.nr-locked { opacity: 0.55; cursor: default; }
    #nr-detect-card .nr-action-row.nr-locked:hover { border-color: #e0d8d0; background: transparent; }
    #nr-detect-card .nr-action-icon {
      width: 28px; height: 28px; border-radius: 6px;
      background: #fdf6f3; color: #c84a1f;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #nr-detect-card .nr-action-icon svg { width: 14px; height: 14px; }
    #nr-detect-card .nr-action-label { flex: 1; font-size: 13px; font-weight: 500; }
    #nr-detect-card .nr-action-cost {
      font-family: monospace; font-size: 10px; color: #9a9286;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    #nr-detect-card .nr-divider { height: 1px; background: #e0d8d0; margin: 10px 0; }
    /* upgrade prompt box */
    #nr-detect-card .nr-upgrade-box {
      padding: 12px; border-radius: 7px; border: 1px solid rgba(200,74,31,0.3);
      background: rgba(200,74,31,0.05); margin-bottom: 7px;
    }
    #nr-detect-card .nr-upgrade-box .nr-ub-title {
      font-size: 12.5px; font-weight: 600; margin-bottom: 4px; color: #1a1814;
    }
    #nr-detect-card .nr-upgrade-box .nr-ub-desc {
      font-size: 11.5px; color: #6b6358; margin-bottom: 10px; line-height: 1.5;
    }
    #nr-detect-card .nr-upgrade-box .nr-ub-actions {
      display: flex; gap: 6px;
    }
    #nr-detect-card .nr-ub-primary {
      flex: 1; padding: 7px; border-radius: 6px; border: none;
      background: #c84a1f; color: #fffdf8;
      font-family: monospace; font-size: 10px; font-weight: 500;
      letter-spacing: 0.1em; text-transform: uppercase;
      cursor: pointer; text-align: center;
    }
    #nr-detect-card .nr-ub-secondary {
      padding: 7px 10px; border-radius: 6px;
      border: 1px solid #e0d8d0; background: transparent; color: #6b6358;
      font-family: monospace; font-size: 10px; letter-spacing: 0.1em;
      text-transform: uppercase; cursor: pointer;
    }
    /* "Not a job?" feedback footer */
    #nr-detect-card .nr-feedback-row {
      margin-top: 10px; padding-top: 8px; border-top: 1px solid #ede8e0;
      display: flex; align-items: center; justify-content: flex-end;
    }
    #nr-detect-card .nr-not-job-btn {
      background: none; border: none; cursor: pointer;
      font-size: 11px; color: #9a9286; padding: 0;
      font-family: inherit;
      text-decoration: underline; text-underline-offset: 2px;
    }
    #nr-detect-card .nr-not-job-btn:hover { color: #6b6358; }
    /* confirm-card style (low-confidence) */
    #nr-detect-card .nr-confirm-body {
      padding: 12px;
    }
    #nr-detect-card .nr-confirm-q {
      font-size: 12px; color: #6b6358; margin-bottom: 10px; line-height: 1.5;
    }
    #nr-detect-card .nr-confirm-actions { display: flex; gap: 6px; }
    /* spinner */
    #nr-detect-card .nr-spin {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid #e0d8d0; border-top-color: #c84a1f;
      border-radius: 50%; animation: nr-rspin 0.7s linear infinite;
    }
    @keyframes nr-rspin { to { transform: rotate(360deg); } }
    /* success resume state */
    #nr-detect-card .nr-resume-ready {
      padding: 10px 11px; border-radius: 7px; background: #edf7ee;
      margin-bottom: 7px; display: flex; flex-direction: column; gap: 7px;
    }
  `;
  document.head.appendChild(s);
}

let _cardTimer = null;

function removeCard() {
  clearTimeout(_cardTimer);
  document.getElementById("nr-detect-card")?.remove();
}

function escapeHtml(str) {
  return (str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ─── Panel A: Job detected card ───────────────────────────────────────────────

function showDetectCard(job) {
  removeCard();
  injectCardStyles();

  // Show the new-job card immediately for instant feedback, then check if the
  // job is already in the pipeline (session cache first, then API).
  showNewJobCard(job);

  try {
    chrome.storage.session.get(["nr_last_job_url", "nr_last_job_id", "nr_last_job_status"], (d) => {
      if (chrome.runtime.lastError) {
        _checkJobUrlViaApi(job);
        return;
      }
      if (d.nr_last_job_url === job.url && d.nr_last_job_id) {
        removeCard();
        showAlreadySavedCard(job, d.nr_last_job_id, d.nr_last_job_status ?? "pending");
      } else {
        _checkJobUrlViaApi(job);
      }
    });
  } catch {
    _checkJobUrlViaApi(job);
  }
}

function _checkJobUrlViaApi(job) {
  if (!job.url) return;
  chrome.runtime.sendMessage({ type: "CHECK_JOB_URL", url: job.url }, (res) => {
    if (chrome.runtime.lastError || !res?.ok || !res?.exists) return;
    chrome.storage.session.set({
      nr_last_job_url:    job.url,
      nr_last_job_id:     res.job_id,
      nr_last_job_status: res.status ?? "pending",
      nr_last_job_title:  res.title  ?? job.title  ?? "",
      nr_last_company:    res.company ?? job.company ?? "",
    });
    removeCard();
    showAlreadySavedCard(job, res.job_id, res.status ?? "pending");
  });
}

// ─── Confirm card (low-confidence / heuristic) ───────────────────────────────
// Shown when heuristic fires but we're not sure it's really a job page.
// User can confirm (→ shows full detect card) or dismiss as not a job.

function showConfirmCard(job) {
  removeCard();
  injectCardStyles();

  const card = document.createElement("div");
  card.id = "nr-detect-card";
  card.innerHTML = `
    <div class="nr-ch">
      <div class="nr-brand">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="14" fill="rgba(255,253,248,0.18)"/>
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole
      </div>
      <button class="nr-cx" id="nr-confirm-close" title="Dismiss">×</button>
    </div>
    <div class="nr-confirm-body">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${escapeHtml(job.title ?? "")}</div>
      <div style="font-size:12px;color:#6b6358;margin-bottom:10px;">${escapeHtml(job.company ?? "")}</div>
      <div class="nr-confirm-q">Is this a job posting you want to track?</div>
      <div class="nr-confirm-actions">
        <button class="nr-btn nr-primary" id="nr-confirm-yes" style="flex:1">Yes, track it</button>
        <button class="nr-btn nr-secondary" id="nr-confirm-no" style="flex:1">Not a job</button>
      </div>
    </div>
  `;
  document.body.appendChild(card);

  card.querySelector("#nr-confirm-close").addEventListener("click", removeCard);

  card.querySelector("#nr-confirm-yes").addEventListener("click", () => {
    sendFeedback("confirmed", job);
    removeCard();
    // Upgrade confidence and show the full card
    showDetectCard({ ...job, confidence: "confirmed" });
  });

  card.querySelector("#nr-confirm-no").addEventListener("click", () => {
    sendFeedback("not_a_job", job);
    removeCard();
  });
}

// ─── "Not a job?" helper ──────────────────────────────────────────────────────

function appendNotAJobLink(card, job) {
  const cb = card.querySelector(".nr-cb");
  if (!cb) return;
  const row = document.createElement("div");
  row.className = "nr-feedback-row";
  row.innerHTML = `<button class="nr-not-job-btn" title="Report false positive">Not a job? Tell us →</button>`;
  cb.appendChild(row);
  row.querySelector(".nr-not-job-btn").addEventListener("click", () => {
    sendFeedback("not_a_job", job);
    removeCard();
  });
}

// ─── Panel A: Job detected card ───────────────────────────────────────────────

function showNewJobCard(job) {
  const card = document.createElement("div");
  card.id = "nr-detect-card";

  let urlDisplay = "";
  try {
    const u = new URL(job.url);
    urlDisplay = u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? u.pathname.slice(0, 30) : "");
  } catch { urlDisplay = (job.url ?? "").slice(0, 40); }

  card.innerHTML = `
    <div class="nr-ch">
      <div class="nr-brand">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="14" fill="rgba(255,253,248,0.18)"/>
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole · Job Detected
      </div>
      <div style="display:flex;align-items:center;gap:2px">
        <button class="nr-minimize" id="nr-card-minimize" title="Minimise">─</button>
        <button class="nr-cx" id="nr-card-close" title="Close">×</button>
      </div>
    </div>
    <div class="nr-cb">
      <div class="nr-title">${escapeHtml(job.title)}</div>
      <div class="nr-company">${escapeHtml(job.company)}</div>
      <div class="nr-url">${escapeHtml(urlDisplay)}</div>
      <div id="nr-card-body-actions">
        <button class="nr-eval-first-btn" id="nr-card-evaluate">
          ✦ Evaluate Fit First
        </button>
        <div class="nr-actions">
          <button class="nr-btn nr-secondary" id="nr-card-save-later">Save for Later</button>
          <button class="nr-btn nr-primary" id="nr-card-save-apply">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(card);

  card.querySelector("#nr-card-close").addEventListener("click", removeCard);
  card.querySelector("#nr-card-minimize").addEventListener("click", () => {
    card.classList.toggle("nr-minimized");
    const btn = card.querySelector("#nr-card-minimize");
    btn.title = card.classList.contains("nr-minimized") ? "Expand" : "Minimise";
    btn.textContent = card.classList.contains("nr-minimized") ? "□" : "─";
  });

  // "Not a job?" feedback link at the bottom
  appendNotAJobLink(card, job);

  // Check login state — swap buttons for sign-in prompt if not authenticated
  try {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (res) => {
      if (chrome.runtime.lastError || !res?.loggedIn) {
        _showCardSignInPrompt(card, job);
        return;
      }
      // Logged in — wire up action buttons
      card.querySelector("#nr-card-evaluate").addEventListener("click", () => {
        submitFromCard(job, "evaluate", card);
      });
      card.querySelector("#nr-card-save-later").addEventListener("click", () => {
        submitFromCard(job, "save_later", card);
      });
      card.querySelector("#nr-card-save-apply").addEventListener("click", () => {
        submitFromCard(job, "save_apply", card);
      });
    });
  } catch {
    _showCardSignInPrompt(card, job);
  }
}

const AUTH_ERROR_STRINGS = ["Unauthorized", "Session expired", "Not logged in", "Not connected", "log in again", "reconnect", "401"];

function _isAuthError(msg) {
  return AUTH_ERROR_STRINGS.some((s) => (msg ?? "").includes(s));
}

// Shows a "Connect to NextRole" button in the card body.
// onSuccess: called after successful connection. Defaults to re-running job detection.
function _showSignInInContainer(container, job, onSuccess) {
  container.innerHTML = `
    <div style="margin-top:10px;padding:12px;border-radius:8px;background:#f5f2ee;text-align:center;">
      <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:#1a1814;">Connect NextRole</div>
      <div style="font-size:11px;color:#6b6358;margin-bottom:10px;line-height:1.5;">Sign in to link this extension to your account.</div>
      <div id="nr-card-connect-error" style="display:none;font-size:11px;color:#b53a3a;background:rgba(181,58,58,0.08);border:1px solid rgba(181,58,58,0.25);border-radius:6px;padding:6px 8px;margin-bottom:8px;line-height:1.4;text-align:left;"></div>
      <button id="nr-card-connect-btn" class="nr-btn nr-primary" style="width:100%;margin-bottom:6px;display:flex;align-items:center;justify-content:center;gap:6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Connect to NextRole
      </button>
      <a href="${NEXTROLE_URL}/signup" target="_blank" style="font-size:11px;color:#c84a1f;text-decoration:none;">No account? Sign up free →</a>
    </div>
  `;

  const errEl = container.querySelector("#nr-card-connect-error");
  const connectBtn = container.querySelector("#nr-card-connect-btn");

  connectBtn.addEventListener("click", () => {
    errEl.style.display = "none";
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting…";

    chrome.runtime.sendMessage({ type: "CONNECT_EXTENSION" }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        errEl.textContent = res?.error ?? "Connection failed. Try again.";
        errEl.style.display = "block";
        connectBtn.disabled = false;
        connectBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Connect to NextRole`;
        return;
      }

      if (typeof onSuccess === "function") {
        onSuccess();
        return;
      }
      // Swap back to action buttons without a GET_SESSION round-trip.
      const card = container.closest("#nr-detect-card");
      container.innerHTML = `
        <button class="nr-eval-first-btn" id="nr-card-evaluate">✦ Evaluate Fit First</button>
        <div class="nr-actions">
          <button class="nr-btn nr-secondary" id="nr-card-save-later">Save for Later</button>
          <button class="nr-btn nr-primary" id="nr-card-save-apply">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>
            </svg>
            Save &amp; Apply
          </button>
        </div>
      `;
      if (card) {
        container.querySelector("#nr-card-evaluate").addEventListener("click", () => submitFromCard(job, "evaluate", card));
        container.querySelector("#nr-card-save-later").addEventListener("click", () => submitFromCard(job, "save_later", card));
        container.querySelector("#nr-card-save-apply").addEventListener("click", () => submitFromCard(job, "save_apply", card));
      }
    });
  });
}

function _showCardSignInPrompt(card, job, onSuccess) {
  const area = card.querySelector("#nr-card-body-actions") ?? card.querySelector(".nr-cb");
  if (!area) return;
  _showSignInInContainer(area, job, onSuccess);
}

function showAlreadySavedCard(job, jobId) {
  const card = document.createElement("div");
  card.id = "nr-detect-card";
  card.innerHTML = `
    <div class="nr-ch-plain">
      <div class="nr-brand" style="color:#1a1814;">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="14" fill="#c84a1f"/>
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole
      </div>
      <div style="display:flex;align-items:center;gap:2px">
        <button class="nr-minimize-plain" id="nr-card-minimize" title="Minimise">─</button>
        <button class="nr-cx-plain" id="nr-card-close" title="Close">×</button>
      </div>
    </div>
    <div class="nr-cb">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="width:18px;height:18px;border-radius:50%;background:#2f7a3a;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;">✓</span>
        <span style="font-size:13px;font-weight:500;color:#2f7a3a;">Already in your pipeline</span>
      </div>
      <div class="nr-title">${escapeHtml(job.title)}</div>
      <div class="nr-company">${escapeHtml(job.company)}</div>
      <div class="nr-actions">
        <button class="nr-btn nr-secondary" id="nr-card-open-pipeline">Open Pipeline →</button>
        <button class="nr-btn nr-primary" id="nr-card-fill-app">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>
          Fill Application
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(card);

  card.querySelector("#nr-card-close").addEventListener("click", removeCard);
  card.querySelector("#nr-card-minimize").addEventListener("click", () => {
    card.classList.toggle("nr-minimized");
    const btn = card.querySelector("#nr-card-minimize");
    btn.title = card.classList.contains("nr-minimized") ? "Expand" : "Minimise";
    btn.textContent = card.classList.contains("nr-minimized") ? "□" : "─";
  });
  card.querySelector("#nr-card-open-pipeline").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/pipeline` });
    removeCard();
  });
  card.querySelector("#nr-card-fill-app").addEventListener("click", () => {
    // Store cross-site context so apply-card.js auto-shows if user is redirected
    // to an ATS apply page (includes jobId for artifact lookup).
    try {
      chrome.storage.session.set({
        nr_cross_site_job: {
          jobId:          jobId,
          jobTitle:       job.title       ?? "",
          company:        job.company     ?? "",
          jobDescription: job.description ?? "",
          sourceUrl:      location.href,
          savedAt:        Date.now(),
        },
      });
    } catch {}
    removeCard();
    document.dispatchEvent(new CustomEvent("nr:open-apply-card", {
      detail: {
        jobId,
        jobTitle:       job.title       ?? "",
        company:        job.company     ?? "",
        jobDescription: job.description ?? "",
      },
    }));
  });

  // "Not a job?" feedback link at the bottom
  appendNotAJobLink(card, job);
}

// ─── Multi-step loading styles ─────────────────────────────────────────────────

function injectStepStyles() {
  if (document.getElementById("nr-step-styles")) return;
  const s = document.createElement("style");
  s.id = "nr-step-styles";
  s.textContent = `
    .nr-steps { display: flex; flex-direction: column; gap: 6px; padding: 12px 0 8px; }
    .nr-step {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #9a9286; transition: color 0.2s;
    }
    .nr-step.nr-step-active { color: #1a1814; font-weight: 500; }
    .nr-step.nr-step-done   { color: #2f7a3a; }
    .nr-step.nr-step-error  { color: #b53a3a; }
    .nr-step-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #e0d8d0; flex-shrink: 0;
      transition: background 0.2s;
    }
    .nr-step.nr-step-active .nr-step-dot { background: #c84a1f; }
    .nr-step.nr-step-done   .nr-step-dot { background: #2f7a3a; }
    .nr-step.nr-step-error  .nr-step-dot { background: #b53a3a; }
    .nr-eval-result {
      padding: 12px; border-radius: 8px; background: #f5f2ee;
      display: flex; flex-direction: column; gap: 8px;
    }
    .nr-eval-score-row { display: flex; align-items: center; gap: 8px; }
    .nr-eval-score {
      font-family: monospace; font-size: 18px; font-weight: 700;
      color: var(--s-color, #1a1814);
    }
    .nr-eval-decision {
      display: inline-flex; align-items: center; padding: 3px 8px;
      border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .nr-eval-decision.apply  { background: #edf7ee; color: #2f7a3a; }
    .nr-eval-decision.watch  { background: #fef9ec; color: #8a6d1a; }
    .nr-eval-decision.skip   { background: #faebeb; color: #b53a3a; }
    .nr-eval-summary { font-size: 12px; color: #6b6358; line-height: 1.45; }
  `;
  document.head.appendChild(s);
}

// ─── Panel B: Helper panel (after save or from already-saved) ─────────────────

function _showReconnectPrompt(body, job, action, card) {
  body.innerHTML = `
    <div style="margin-top:8px;padding:12px;border-radius:8px;background:#f5f2ee;text-align:center;">
      <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:#1a1814;">Session expired</div>
      <div style="font-size:11px;color:#6b6358;margin-bottom:10px;">Please reconnect the extension to continue.</div>
      <div id="nr-reconnect-err" style="display:none;font-size:11px;color:#b53a3a;background:rgba(181,58,58,0.08);border:1px solid rgba(181,58,58,0.25);border-radius:6px;padding:6px 8px;margin-bottom:8px;"></div>
      <button id="nr-reconnect-btn" class="nr-btn nr-primary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Reconnect to NextRole
      </button>
    </div>
  `;

  body.querySelector("#nr-reconnect-btn").addEventListener("click", () => {
    const btn = body.querySelector("#nr-reconnect-btn");
    const errEl = body.querySelector("#nr-reconnect-err");
    errEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Reconnecting…";

    chrome.runtime.sendMessage({ type: "CONNECT_EXTENSION" }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        errEl.textContent = res?.error ?? "Connection failed. Try again.";
        errEl.style.display = "block";
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Reconnect to NextRole`;
        return;
      }
      // Reconnected — retry the action from scratch
      submitFromCard(job, action, card);
    });
  });
}

function submitFromCard(job, action, card) {
  const evalBtn  = card.querySelector("#nr-card-evaluate");
  const saveBtn  = card.querySelector("#nr-card-save-later");
  const applyBtn = card.querySelector("#nr-card-save-apply");
  if (evalBtn)  evalBtn.disabled  = true;
  if (saveBtn)  saveBtn.disabled  = true;
  if (applyBtn) applyBtn.disabled = true;

  // Save job to pipeline first
  chrome.runtime.sendMessage(
    { type: "SUBMIT_JOB", job: { title: job.title, company: job.company, url: job.url, description: job.description, source: "extension" } },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        const errMsg = response?.error ?? "Error — try again.";
        if (_isAuthError(errMsg)) {
          const body = card.querySelector(".nr-cb");
          if (body) _showReconnectPrompt(body, job, action, card);
        } else {
          if (evalBtn)  evalBtn.disabled  = false;
          if (saveBtn)  saveBtn.disabled  = false;
          if (applyBtn) applyBtn.disabled = false;
          const body = card.querySelector(".nr-cb");
          if (body) {
            const errEl = document.createElement("div");
            errEl.style.cssText = "font-size:12px;color:#b53a3a;margin-top:8px;";
            errEl.textContent = errMsg;
            body.appendChild(errEl);
            setTimeout(() => errEl.remove(), 4000);
          }
        }
        return;
      }

      const jobId = response.job_id;

      // Write session caches so ATS redirect picks up the job context
      if (jobId) {
        chrome.storage.session.set({
          nr_last_job_url:   job.url,
          nr_last_job_id:    jobId,
          nr_last_job_title: job.title   ?? "",
          nr_last_company:   job.company ?? "",
          nr_cross_site_job: {
            jobId:          jobId,
            jobTitle:       job.title       ?? "",
            company:        job.company     ?? "",
            jobDescription: job.description ?? "",
            sourceUrl:      location.href,
            savedAt:        Date.now(),
          },
        });
      }

      removeCard();

      if ((action === "save_apply" || action === "evaluate") && jobId) {
        // Open the apply card immediately — auto-fill.js and apply-card.js both run on this page.
        // Pass job data in the event detail so apply-card.js can skip the API round-trip.
        document.dispatchEvent(new CustomEvent("nr:open-apply-card", {
          detail: {
            jobId,
            jobTitle:       job.title       ?? "",
            company:        job.company     ?? "",
            jobDescription: job.description ?? "",
            mode:           action === "evaluate" ? "evaluate" : "fill",
          },
        }));
      }
      // "save_later" just saves and dismisses — nothing more to do
    }
  );
}

// ─── Helper panel (Panel B) ───────────────────────────────────────────────────

let _helperResumeHtml = null;

function showHelperPanel(job, jobId, opts = {}) {
  injectCardStyles();

  const card = document.createElement("div");
  card.id = "nr-detect-card";
  card.innerHTML = `
    <div class="nr-ch">
      <div class="nr-brand">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="14" fill="rgba(255,253,248,0.18)"/>
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole · Application Helper
      </div>
      <div style="display:flex;align-items:center;gap:2px">
        <button class="nr-minimize" id="nr-helper-minimize" title="Minimise">─</button>
        <button class="nr-cx" id="nr-helper-close" title="Close">×</button>
      </div>
    </div>
    <div class="nr-cb">
      <div class="nr-saved-row">
        <span class="nr-saved-check">✓</span>
        <div>
          <div style="font-size:12.5px;font-weight:500;">Saved to pipeline</div>
          <div style="font-size:11.5px;color:#6b6358;">${escapeHtml(job.title)} · ${escapeHtml(job.company)}</div>
        </div>
      </div>
      <div style="font-size:12px;color:#6b6358;margin-bottom:10px;">Filling out the application?</div>
      <div id="nr-helper-eval-area"></div>
      <div id="nr-helper-resume-area"></div>
      <div id="nr-helper-autofill-area"></div>
      <div class="nr-divider"></div>
      <button class="nr-btn nr-ghost" id="nr-helper-open-pipeline">Open Pipeline →</button>
    </div>
  `;
  document.body.appendChild(card);

  card.querySelector("#nr-helper-close").addEventListener("click", removeCard);
  card.querySelector("#nr-helper-minimize").addEventListener("click", () => {
    card.classList.toggle("nr-minimized");
    const btn = card.querySelector("#nr-helper-minimize");
    btn.title     = card.classList.contains("nr-minimized") ? "Expand" : "Minimise";
    btn.textContent = card.classList.contains("nr-minimized") ? "□" : "─";
  });
  card.querySelector("#nr-helper-open-pipeline").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/pipeline` });
    removeCard();
  });

  // Load profile to get tier + usage, then render action buttons.
  // profileRes shape: { ok: true, profile: { tier, usage, limits, ... } }
  chrome.runtime.sendMessage({ type: "GET_PROFILE" }, (profileRes) => {
    const p      = profileRes?.profile ?? {};
    const tier   = p.tier   ?? "free";
    const usage  = p.usage  ?? {};
    const limits = p.limits ?? {};

    renderEvaluateButton(card, job, jobId, tier, usage, limits, opts.evalResult);
    renderResumeButton(card, job, jobId, tier, usage, limits);
    renderAutofillButton(card, job, tier, usage, limits);
  });
}

// ─── Evaluate button (helper panel) ──────────────────────────────────────────

function _showEvalResultInArea(area, evalRes, jobId) {
  const score      = evalRes.score ?? 0;
  const decision   = evalRes.decision ?? "watch";
  const summary    = evalRes.blocks?.decision?.rationale ?? evalRes.blocks?.role_fit?.summary ?? "";
  const scoreColor = score >= 3.5 ? "#2f7a3a" : score >= 2.5 ? "#8a6d1a" : "#b53a3a";

  area.innerHTML = `
    <div class="nr-eval-result" style="margin-bottom:7px;">
      <div class="nr-eval-score-row">
        <span class="nr-eval-score" style="--s-color:${scoreColor}">${score.toFixed(1)}</span>
        <span class="nr-eval-decision ${decision}">${decision}</span>
      </div>
      ${summary ? `<div class="nr-eval-summary">${escapeHtml(summary.slice(0, 120))}${summary.length > 120 ? "…" : ""}</div>` : ""}
      <button class="nr-btn nr-primary" id="nr-heval-open" style="margin-top:4px;">View full evaluation →</button>
    </div>
  `;
  area.querySelector("#nr-heval-open")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "OPEN_TAB",
      url: evalRes.evaluation_id
        ? `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}&eval=${evalRes.evaluation_id}`
        : `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}`,
    });
    removeCard();
  });
}

function renderEvaluateButton(card, job, jobId, tier, usage, limits, evalResult) {
  const area = card.querySelector("#nr-helper-eval-area");
  if (!area || !jobId) return;

  // If we already have a result (came from the detect-card evaluate flow), show it directly
  if (evalResult) {
    _showEvalResultInArea(area, evalResult, jobId);
    return;
  }

  const evalsToday = usage.evaluations_today ?? 0;
  const evalLimit  = limits.evaluations_per_day ?? 1;
  const atLimit    = evalLimit !== -1 && evalsToday >= evalLimit;

  if (atLimit) {
    area.innerHTML = `
      <div class="nr-upgrade-box">
        <div class="nr-ub-title">AI Evaluate</div>
        <div class="nr-ub-desc">You've used your free evaluation for today. Upgrade for more daily evaluations.</div>
        <div class="nr-ub-actions">
          <button class="nr-ub-primary" id="nr-eval-upgrade">Upgrade →</button>
          <button class="nr-ub-secondary" id="nr-eval-dismiss">Not now</button>
        </div>
      </div>
    `;
    area.querySelector("#nr-eval-upgrade").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/billing?feature=evaluate` });
    });
    area.querySelector("#nr-eval-dismiss").addEventListener("click", () => { area.innerHTML = ""; });
    return;
  }

  const costLabel = tier === "free" ? "1/day free" : "5 credits";

  area.innerHTML = `
    <div class="nr-action-row" id="nr-eval-btn">
      <div class="nr-action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></svg>
      </div>
      <span class="nr-action-label">AI Evaluate</span>
      <span class="nr-action-cost">${costLabel}</span>
    </div>
    <div id="nr-heval-result-area"></div>
  `;

  area.querySelector("#nr-eval-btn").addEventListener("click", () => {
    runEvaluateInHelper(area, job, jobId);
  });
}

function runEvaluateInHelper(area, job, jobId) {
  injectStepStyles();

  area.innerHTML = `
    <div style="padding:10px 11px;border-radius:7px;background:#f5f2ee;margin-bottom:7px;">
      <div class="nr-steps">
        <div class="nr-step nr-step-active" id="nr-hestep-fetch"><span class="nr-step-dot"></span>Fetching your profile</div>
        <div class="nr-step" id="nr-hestep-eval"><span class="nr-step-dot"></span>Running AI evaluation</div>
        <div class="nr-step" id="nr-hestep-compare"><span class="nr-step-dot"></span>Comparing with your CV</div>
        <div class="nr-step" id="nr-hestep-done"><span class="nr-step-dot"></span>Ready</div>
      </div>
    </div>
    <div id="nr-heval-result-area"></div>
  `;

  function setHStep(id, state) {
    const el = area.querySelector(`#${id}`);
    if (!el) return;
    el.className = `nr-step nr-step-${state}`;
  }

  setTimeout(() => { setHStep("nr-hestep-fetch", "done"); setHStep("nr-hestep-eval", "active"); }, 800);

  const compareTimer = setTimeout(() => {
    setHStep("nr-hestep-eval", "done");
    setHStep("nr-hestep-compare", "active");
  }, 8000);

  chrome.runtime.sendMessage({ type: "EVALUATE_JOB", jobId }, (evalRes) => {
    clearTimeout(compareTimer);

    if (chrome.runtime.lastError || !evalRes?.ok) {
      setHStep("nr-hestep-eval", "error");
      setHStep("nr-hestep-compare", "error");
      const resultArea = area.querySelector("#nr-heval-result-area");
      if (resultArea) {
        resultArea.innerHTML = `
          <div style="padding:8px 0;font-size:12px;color:#b53a3a;">${escapeHtml(evalRes?.error ?? "Evaluation failed — try again")}</div>
          ${evalRes?.upgrade ? `
            <button class="nr-btn nr-primary" id="nr-heval-upgrade" style="margin-top:4px;">Upgrade plan →</button>
          ` : `
            <button class="nr-btn nr-secondary" id="nr-heval-retry" style="margin-top:4px;">Retry</button>
          `}
        `;
        resultArea.querySelector("#nr-heval-upgrade")?.addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/billing` });
          removeCard();
        });
        resultArea.querySelector("#nr-heval-retry")?.addEventListener("click", () => {
          runEvaluateInHelper(area, job, jobId);
        });
      }
      return;
    }

    setHStep("nr-hestep-fetch", "done");
    setHStep("nr-hestep-eval", "done");
    setHStep("nr-hestep-compare", "done");
    setHStep("nr-hestep-done", "done");

    // Reuse shared helper — replaces the steps box with the result
    _showEvalResultInArea(area, evalRes, jobId);
  });
}

// ─── Resume button ────────────────────────────────────────────────────────────

function renderResumeButton(card, job, jobId, tier, usage, limits) {
  const area = card.querySelector("#nr-helper-resume-area");
  if (!area) return;

  const resumesToday = usage.resumes_today ?? 0;
  const resumeLimit  = limits.resumes_per_day ?? 1;  // 1 for free, -1 for paid
  const atLimit = tier === "free" && resumesToday >= resumeLimit;

  if (atLimit) {
    area.innerHTML = `
      <div class="nr-upgrade-box">
        <div class="nr-ub-title">📄 Custom resume</div>
        <div class="nr-ub-desc">You've used your free resume for today. Upgrade Starter for daily credits.</div>
        <div class="nr-ub-actions">
          <button class="nr-ub-primary" id="nr-resume-upgrade">Upgrade →</button>
          <button class="nr-ub-secondary" id="nr-resume-dismiss">Not now</button>
        </div>
      </div>
    `;
    area.querySelector("#nr-resume-upgrade").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/billing?feature=resume` });
    });
    area.querySelector("#nr-resume-dismiss").addEventListener("click", () => {
      area.innerHTML = "";
    });
    return;
  }

  const costLabel = tier === "free" ? "1 / day" : "10 credits";

  area.innerHTML = `
    <div class="nr-action-row" id="nr-resume-btn">
      <div class="nr-action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>
      </div>
      <span class="nr-action-label">Get Custom Resume</span>
      <span class="nr-action-cost">${costLabel}</span>
    </div>
    <div id="nr-resume-result" style="display:none;"></div>
  `;

  area.querySelector("#nr-resume-btn").addEventListener("click", () => {
    tailorResumeInCard(card, area, job, jobId, tier);
  });
}

function tailorResumeInCard(card, area, job, jobId, tier) {
  injectStepStyles();

  area.innerHTML = `
    <div style="padding:10px 11px;border-radius:7px;background:#f5f2ee;margin-bottom:7px;">
      <div style="font-size:12.5px;font-weight:500;margin-bottom:8px;">
        ${escapeHtml(job.title)} at ${escapeHtml(job.company)}
      </div>
      <div class="nr-steps" id="nr-resume-steps">
        <div class="nr-step nr-step-active" id="nr-rstep-analyze"><span class="nr-step-dot"></span>Analyzing job description…</div>
        <div class="nr-step" id="nr-rstep-tailor"><span class="nr-step-dot"></span>Tailoring your CV</div>
        <div class="nr-step" id="nr-rstep-build"><span class="nr-step-dot"></span>Building resume</div>
        <div class="nr-step" id="nr-rstep-done"><span class="nr-step-dot"></span>Ready</div>
      </div>
    </div>
    <div id="nr-resume-result-area"></div>
  `;

  function setRStep(id, state) {
    const el = area.querySelector(`#${id}`);
    if (!el) return;
    el.className = `nr-step nr-step-${state}`;
  }

  // Advance steps with delays for UX feedback
  const t1 = setTimeout(() => { setRStep("nr-rstep-analyze", "done"); setRStep("nr-rstep-tailor", "active"); }, 1200);
  const t2 = setTimeout(() => { setRStep("nr-rstep-tailor", "done"); setRStep("nr-rstep-build", "active"); }, 4000);

  const payload = {
    job_id:          jobId || null,
    job_title:       job.title,
    company:         job.company,
    job_description: job.description,
  };

  chrome.runtime.sendMessage({ type: "TAILOR_RESUME", payload }, (res) => {
    clearTimeout(t1); clearTimeout(t2);

    if (chrome.runtime.lastError || !res?.ok) {
      setRStep("nr-rstep-tailor", "error");
      setRStep("nr-rstep-build", "error");
      const resultArea = area.querySelector("#nr-resume-result-area");
      if (resultArea) {
        resultArea.innerHTML = `
          <div style="padding:8px 0;font-size:12px;color:#b53a3a;">${escapeHtml(res?.error ?? "Resume generation failed")}</div>
          ${res?.upgrade ? `
            <button class="nr-btn nr-primary" id="nr-resume-upgrade" style="margin-top:4px;">Upgrade plan →</button>
          ` : `
            <button class="nr-btn nr-secondary" id="nr-resume-retry" style="margin-top:4px;">Retry</button>
          `}
        `;
        resultArea.querySelector("#nr-resume-upgrade")?.addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/billing?feature=resume` });
          removeCard();
        });
        resultArea.querySelector("#nr-resume-retry")?.addEventListener("click", () => {
          tailorResumeInCard(card, area, job, jobId, tier);
        });
      }
      return;
    }

    setRStep("nr-rstep-analyze", "done");
    setRStep("nr-rstep-tailor", "done");
    setRStep("nr-rstep-build", "done");
    setRStep("nr-rstep-done", "done");

    _helperResumeHtml = res.html;
    const coverage = res.coverage ?? "";
    const resultArea = area.querySelector("#nr-resume-result-area");
    if (resultArea) {
      resultArea.innerHTML = `
        <div class="nr-resume-ready">
          <div style="font-size:12.5px;font-weight:500;color:#2f7a3a;">✓ Resume ready · ${coverage}% keyword match</div>
          <div style="display:flex;gap:6px;margin-top:2px;">
            <button class="nr-btn nr-primary" id="nr-resume-open" style="flex:1;">⬇ Download Resume</button>
            ${res.resume_id ? `<button class="nr-btn nr-secondary" id="nr-resume-dash" style="flex:unset;padding:8px 10px;">View all</button>` : ""}
          </div>
        </div>
      `;
      resultArea.querySelector("#nr-resume-open")?.addEventListener("click", () => {
        const blob = new Blob([_helperResumeHtml], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeName = `NextRole-${(job.company ?? "Resume").replace(/[^a-z0-9]/gi, "-")}-${(job.title ?? "").replace(/[^a-z0-9]/gi, "-").slice(0, 30)}.html`;
        a.href = blobUrl;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      });
      resultArea.querySelector("#nr-resume-dash")?.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/resumes` });
      });
    }
  });
}

// ─── Autofill button ──────────────────────────────────────────────────────────

function renderAutofillButton(card, job, tier, usage, limits) {
  const area = card.querySelector("#nr-helper-autofill-area");
  if (!area) return;

  // Free users — hard gate
  if (tier === "free") {
    area.innerHTML = `
      <div class="nr-action-row nr-locked" title="Autofill requires Starter or above">
        <div class="nr-action-icon" style="opacity:0.45;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>
        </div>
        <span class="nr-action-label" style="color:#9a9286;">Autofill Fields</span>
        <span style="font-family:monospace;font-size:10px;color:#c84a1f;display:flex;align-items:center;gap:3px;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          Starter
        </span>
      </div>
    `;
    area.querySelector(".nr-action-row").addEventListener("click", () => {
      showAutofillUpgrade(area, tier, "autofill_basic");
    });
    return;
  }

  // Starter — check daily credit cap (16 credits = 8 AI suggestions at 2cr each)
  const STARTER_DAILY_AUTOFILL_CREDIT_CAP = 16;
  const creditsUsedToday = usage.autofill_credits_used_today ?? 0;
  const atLimit = tier === "starter" && creditsUsedToday >= STARTER_DAILY_AUTOFILL_CREDIT_CAP;

  if (atLimit) {
    area.innerHTML = `
      <div class="nr-upgrade-box">
        <div class="nr-ub-title">⚡ Autofill</div>
        <div class="nr-ub-desc">You've used all 8 AI suggestions for today (16-credit daily cap). Upgrade to Pro for unlimited.</div>
        <div class="nr-ub-actions">
          <button class="nr-ub-primary" id="nr-autofill-upgrade">Upgrade to Pro →</button>
          <button class="nr-ub-secondary" id="nr-autofill-dismiss">Not now</button>
        </div>
      </div>
    `;
    area.querySelector("#nr-autofill-upgrade").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/billing?feature=autofill` });
    });
    area.querySelector("#nr-autofill-dismiss").addEventListener("click", () => { area.innerHTML = ""; });
    return;
  }

  const label     = "Autofill Fields";
  const costLabel = tier === "starter" ? "2cr · 8 AI/day" : "2 credits";

  area.innerHTML = `
    <div class="nr-action-row" id="nr-autofill-btn">
      <div class="nr-action-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>
      </div>
      <span class="nr-action-label">${label}</span>
      <span class="nr-action-cost">${costLabel}</span>
    </div>
  `;
  area.querySelector("#nr-autofill-btn").addEventListener("click", () => {
    triggerAutofill(area, job, tier);
  });
}

function showAutofillUpgrade(area, tier, feature) {
  const planName = "Starter";
  area.innerHTML = `
    <div class="nr-upgrade-box">
      <div class="nr-ub-title">⚡ Autofill Fields</div>
      <div class="nr-ub-desc">Autofill isn't available on the Free plan. Available on ${planName} and above.</div>
      <div class="nr-ub-actions">
        <button class="nr-ub-primary" id="nr-af-upgrade">Upgrade →</button>
        <button class="nr-ub-secondary" id="nr-af-dismiss">Not now</button>
      </div>
    </div>
  `;
  area.querySelector("#nr-af-upgrade").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/billing?feature=${feature}` });
  });
  area.querySelector("#nr-af-dismiss").addEventListener("click", () => { area.innerHTML = ""; });
}

function triggerAutofill(area, job, tier) {
  area.querySelector("#nr-autofill-btn").innerHTML = `
    <div class="nr-action-icon"><span class="nr-spin"></span></div>
    <span class="nr-action-label">Filling fields…</span>
  `;

  // Trigger the fill-assistant content script via a custom event
  // fill-assistant.js listens for this and fills the form
  document.dispatchEvent(new CustomEvent("nr-autofill-trigger", {
    detail: { tier, job }
  }));

  // Listen for result
  const onResult = (e) => {
    document.removeEventListener("nr-autofill-result", onResult);
    const { filled, error } = e.detail ?? {};
    if (error) {
      area.innerHTML = `<div style="font-size:12px;color:#b53a3a;padding:8px 0;">${escapeHtml(error)}</div>`;
      return;
    }
    area.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 11px;border-radius:7px;background:#edf7ee;margin-bottom:7px;">
        <span style="color:#2f7a3a;font-size:14px;">✓</span>
        <div style="font-size:12.5px;font-weight:500;color:#2f7a3a;">
          ${tier === "pro" ? "All fields filled" : "Basic fields filled"}
          ${filled ? `<span style="font-size:11.5px;font-weight:400;color:#6b6358;"> · ${filled} fields</span>` : ""}
        </div>
      </div>
    `;
  };
  document.addEventListener("nr-autofill-result", onResult);
  // Fallback timeout
  setTimeout(() => { document.removeEventListener("nr-autofill-result", onResult); }, 8000);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_JOB") {
    sendResponse({ job: extractJob() });
  }
  // Popup → content: open the floating apply card right now (Save & Apply flow).
  // Used when the current tab is already an apply-form page so the user doesn't
  // need to reload or navigate elsewhere to trigger the card.
  if (msg.type === "OPEN_APPLY_CARD") {
    const p = msg.payload ?? {};
    document.dispatchEvent(new CustomEvent("nr:open-apply-card", {
      detail: {
        jobId:          p.jobId          ?? null,
        jobTitle:       p.jobTitle       ?? "",
        company:        p.company        ?? "",
        jobDescription: p.jobDescription ?? "",
        mode:           "fill",
      },
    }));
    sendResponse({ ok: true });
  }
  return true;
});

// Send feedback to server (fire-and-forget)
function sendFeedback(action, job) {
  chrome.runtime.sendMessage({
    type: "REPORT_FEEDBACK",
    payload: {
      url:        job?.url ?? location.href,
      page_title: document.title,
      action,
      source:     job?.source     ?? "unknown",
      confidence: job?.confidence ?? "unknown",
    },
  });
}

// Returns true if any job was found and card shown.
// Low-confidence (heuristic) shows a softer "Is this a job?" prompt —
// user must confirm before seeing action buttons.
function detectAndShow() {
  const job = extractJob();
  if (!job) return false;

  const isHigh = job.confidence !== "low";
  chrome.runtime.sendMessage({ type: "JOB_DETECTED", found: isHigh });

  if (job.confidence === "low") {
    // Don't auto-assume — ask the user first.
    showConfirmCard(job);
  } else {
    showDetectCard(job);
  }
  return true;
}

// Retry at 1s → 2.5s → 5s → 9s → 15s after navigation.
// Heavy SPAs (Workday, LinkedIn) can take many seconds to render job content.
let _retryTimer = null;
const RETRY_DELAYS = [1000, 2500, 5000, 9000, 15000];

function detectWithRetry() {
  clearTimeout(_retryTimer);
  let attempt = 0;

  function tryOnce() {
    if (detectAndShow()) return; // found — stop
    if (attempt < RETRY_DELAYS.length) {
      _retryTimer = setTimeout(tryOnce, RETRY_DELAYS[attempt++]);
    }
  }

  tryOnce();
}

// ── Apply button interception ──────────────────────────────────────────────────
// When user clicks ANY "Apply" button on a page where we detected a job,
// save the job context to session storage. This is the universal handoff that
// ensures the application form page (which may be on a completely different domain)
// always has the correct job title, company, and JD for autofill and AI suggestions.

const APPLY_TEXT_RE = /^(easy\s+)?apply(\s+(now|online|for\s+this\s+job|to\s+this\s+job|here|for\s+job))?$/i;

document.addEventListener("click", (e) => {
  // Walk up from click target to find a button or link
  const el = e.target.closest("a[href], button, input[type='button'], input[type='submit'], [role='button']");
  if (!el) return;

  // Normalize: strip icon/SVG text from innerText before matching
  const rawText = (el.getAttribute("aria-label") || el.innerText || el.textContent || el.value || "").trim();
  // Remove non-letter chars at start (e.g. icon glyphs) and collapse whitespace
  const text = rawText.replace(/^[^\p{L}]+/u, "").replace(/\s+/g, " ").trim();
  if (!APPLY_TEXT_RE.test(text)) return;

  // Extract current job context — Oracle HCM renders dynamically so we must
  // also fall back to whatever the detection card last saw in session storage.
  const job = extractJob();

  if (job?.title) {
    try {
      // Tag Naukri source so the landing ATS page can show a "Redirected from Naukri" banner
      const isNaukri = location.hostname.includes("naukri.com");
      chrome.storage.session.set({
        nr_cross_site_job: {
          jobTitle:       job.title       ?? "",
          company:        job.company     ?? "",
          jobDescription: job.description ?? "",
          sourceUrl:      location.href,
          savedAt:        Date.now(),
          ...(isNaukri && {
            fromNaukri:   true,
            naukriJobId:  job.siteJobId ?? null,
          }),
        },
      });
    } catch {}
  } else {
    // Oracle JET / SPA: DOM may not be ready yet — copy from already-saved session context
    try {
      chrome.storage.session.get(["nr_last_job_title", "nr_last_company"], (d) => {
        if (chrome.runtime.lastError) return;
        if (!d.nr_last_job_title) return;
        chrome.storage.session.set({
          nr_cross_site_job: {
            jobTitle:       d.nr_last_job_title ?? "",
            company:        d.nr_last_company   ?? "",
            jobDescription: "",
            sourceUrl:      location.href,
            savedAt:        Date.now(),
          },
        });
      });
    } catch {}
  }
}, true); // capture phase — fires before navigation happens

// ── Naukri: clear cross-site context when chatbot opens ──────────────────────
// When user clicks the chatbot-based "Apply" on Naukri the click interceptor
// above still saves nr_cross_site_job (we can't know which button type it is at
// click-time). If the chatbot panel then opens within 5 s we know the user is
// applying on Naukri itself — no redirect will happen — so the cross-site context
// would be stale noise on future ATS visits. Clear it.
if (location.hostname.includes("naukri.com")) {
  function _watchNaukriChatbot() {
    const chatbotEl = document.querySelector("#chatbot-container");
    if (!chatbotEl) return;
    new MutationObserver(() => {
      if (chatbotEl.children.length === 0) return; // collapsed / empty — no action
      try {
        chrome.storage.session.get("nr_cross_site_job", (d) => {
          if (chrome.runtime.lastError) return;
          const ctx = d.nr_cross_site_job;
          // Only clear if saved very recently (≤5 s) — i.e. from THIS Apply click
          if (ctx && ctx.fromNaukri && (Date.now() - (ctx.savedAt ?? 0)) <= 5000) {
            chrome.storage.session.remove("nr_cross_site_job");
          }
        });
      } catch {}
    }).observe(chatbotEl, { childList: true });
  }
  _watchNaukriChatbot();
  if (document.readyState !== "complete") {
    window.addEventListener("load", _watchNaukriChatbot, { once: true });
  }
}

// Initial detection
detectWithRetry();

// ── Unified DOM watcher ───────────────────────────────────────────────────────
//
// One MutationObserver handles two cases:
//
//  Case 1 — SPA navigation (URL changed)
//    e.g. LinkedIn, Indeed, Greenhouse, Workday, Lever clicking a job card.
//    → clear card, re-detect immediately with retry.
//
//  Case 2 — Popup / panel appeared WITHOUT a URL change
//    e.g. Naukri right-panel, Wellfound modal, Glassdoor drawer, Oracle drawer,
//    Shine popup, Foundit panel, company career pages with inline JD overlays.
//    The JD is injected into the DOM as a large text block.
//    → debounce 500ms, check for job-like content, re-detect or update session.
//
// Job-keyword threshold: ≥ 300 chars added AND matches one of the job signals.
// This filters out ad refreshes, nav updates, toast messages, etc.

const JOB_POPUP_KEYWORDS = /responsibilit|qualificat|requirement|years.{0,10}experience|skill|we are looking|job description|about.{0,15}role|about.{0,15}position|what you.{0,10}do|what we.{0,10}offer|education|compensation|benefit/i;

let _lastUrl       = location.href;
let _popupTimer    = null;
let _lastPopupText = ""; // deduplicate identical popups

new MutationObserver((mutations) => {

  // ── Case 1: URL changed ──────────────────────────────────────────────────
  if (location.href !== _lastUrl) {
    _lastUrl = location.href;
    clearTimeout(_popupTimer);
    detectWithRetry();
    return; // URL change takes priority — don't also run popup logic
  }

  // ── Case 2: Content added without URL change ─────────────────────────────
  // Collect text from newly added element nodes only (not text nodes).
  // Short-circuit as soon as we have enough chars to test.
  let addedText = "";
  outer: for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      addedText += " " + (n.textContent ?? "");
      if (addedText.length > 500) break outer;
    }
  }

  const trimmed = addedText.trim();
  if (trimmed.length < 300) return;                      // too small — skip
  if (!JOB_POPUP_KEYWORDS.test(trimmed)) return;         // not job content — skip
  if (trimmed === _lastPopupText) return;                 // same popup re-rendered — skip
  _lastPopupText = trimmed;

  clearTimeout(_popupTimer);
  _popupTimer = setTimeout(() => {
    const job = extractJob();
    if (!job) return;

    // Always cache whatever description we found so the apply page has it.
    // This is the key handoff: JD from listing/detail panel → apply form.
    if (job.description) {
      try {
        chrome.storage.session.get("nr_cross_site_job", (d) => {
          const prev = d.nr_cross_site_job;
          // Overwrite if: no existing context, or it's the same job, or context is stale (> 10 min).
          const isStale   = !prev || (Date.now() - (prev.savedAt ?? 0)) > 10 * 60 * 1000;
          const isSameJob = prev?.jobTitle === job.title;
          if (isStale || isSameJob) {
            chrome.storage.session.set({
              nr_cross_site_job: {
                jobTitle:       job.title       ?? "",
                company:        job.company     ?? "",
                jobDescription: job.description ?? "",
                sourceUrl:      location.href,
                savedAt:        Date.now(),
              },
            });
          }
        });
      } catch {}
    }

    // Show detection card if one isn't already visible.
    if (!document.getElementById("nr-detect-card")) {
      detectWithRetry();
    }
  }, 500);

}).observe(document.body, { childList: true, subtree: true });

// bfcache restore — fires when the user hits back/forward to a frozen page.
// Scripts don't re-run in bfcache, so we must re-detect here.
window.addEventListener("pageshow", (e) => { if (e.persisted) detectWithRetry(); });
