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
  // Only job detail pages — not company pages, search results, feed, or collections
  if (!location.pathname.includes("/jobs/view/")) return null;

  const title = texts([
    ".job-details-jobs-unified-top-card__job-title h1",
    ".job-details-jobs-unified-top-card__job-title",
    "h1.t-24.t-bold",
    ".topcard__title",
    "h1",
  ]);

  const company = texts([
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".job-details-jobs-unified-top-card__primary-description-without-tagline a",
    ".topcard__org-name-link",
    ".topcard__flavor--black-link",
    '[data-tracking-control-name="public_jobs_topcard-org-name"]',
  ]);

  // LinkedIn truncates with .show-more-less-html — grab both variants and pick longer
  const descA = texts([
    ".show-more-less-html__markup--more",   // expanded state
    ".show-more-less-html__markup",          // any state
    ".jobs-description__content",
    ".jobs-description-content__text",
    ".description__text",
  ]);
  // Also try the raw innerHTML → strip tags (catches content hidden by max-height CSS)
  const descEl =
    document.querySelector(".jobs-box__html-content") ??
    document.querySelector(".jobs-description-content__text") ??
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

  const company =
    metaContent("og:site_name") ??
    text('[data-automation-id="breadcrumb-row"] a') ??
    companyFromDomain();

  const descEl =
    document.querySelector('[data-automation-id="jobPostingDescription"]') ??
    document.querySelector('[data-automation-id="job-posting-description"]') ??
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

  const title = texts([
    '[class*="jd-header-title"]',
    '[class*="job-tittle"] h1',
    '[class*="jobTitle"]',
    'h1',
  ]);

  const company = texts([
    '[class*="comp-name"] a',
    '[class*="comp-name"]',
    '[class*="company-name"]',
    '[class*="companyName"]',
  ]) ?? companyFromDomain();

  const descEl =
    document.querySelector('[class*="job-desc"]') ??
    document.querySelector('[class*="jobDesc"]') ??
    document.querySelector('[class*="job-description"]') ??
    document.querySelector("section.job-desc");
  const description = descEl ? cleanText(descEl.innerText) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "naukri" };
  }
  return null;
}

// ─── Extractor 13: iCIMS ─────────────────────────────────────────────────────

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

// ─── Extractor 15: Taleo (Oracle Recruiting) ─────────────────────────────────

function fromTaleo() {
  if (!location.hostname.includes("taleo.net")) return null;

  const title = texts([
    "h1.jobTitle",
    ".requisitionDetails h1",
    "[id*='reqTitle']",
    "[id*='jobTitle']",
    "h1",
  ]);

  const company =
    metaContent("og:site_name") ??
    metaContent("application-name") ??
    companyFromDomain();

  const descEl =
    document.querySelector(".jd-info") ??
    document.querySelector("#description") ??
    document.querySelector('[class*="requisition-description"]') ??
    document.querySelector("main");
  const description = descEl ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " ")) : null;

  if (title) {
    return { title, company, description, confidence: "high", source: "taleo" };
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

// ─── Extractor 22: Heuristic fallback (any job site) ─────────────────────────

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

  // Signal 1: URL contains job-related path segments
  const JOB_URL = /\/job|\/career|\/vacancy|\/position|\/opening|\/recruit|job[-_]listing|viewjob/i;

  // Signal 2: page content mentions job description terms
  const JOB_CONTENT = /responsibilities|requirements|qualifications|experience required|what you.ll do|about the role|job description|apply now|salary|compensation|benefits|perks/i;

  // Signal 3: common job-page DOM patterns
  const JOB_DOM = !!(
    document.querySelector('[class*="apply"], [id*="apply"]') ??
    document.querySelector('[class*="salary"], [id*="salary"]') ??
    document.querySelector('[class*="job-title"], [class*="jobTitle"]')
  );

  if (!JOB_URL.test(location.href) && !JOB_CONTENT.test(contentText) && !JOB_DOM) return null;

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
    fromICIMS() ??
    fromBambooHR() ??
    fromTaleo() ??
    fromJazzHR() ??
    fromRecruitee() ??
    fromBreezyHR() ??
    fromJobvite() ??
    fromTeamtailor() ??
    fromPersonio() ??
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

  // Check if this URL was already saved in this session
  chrome.storage.session.get(["nr_last_job_url", "nr_last_job_id"], (d) => {
    if (d.nr_last_job_url === job.url && d.nr_last_job_id) {
      showAlreadySavedCard(job, d.nr_last_job_id);
      return;
    }
    showNewJobCard(job);
  });
}

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
      <button class="nr-cx" id="nr-card-close">×</button>
    </div>
    <div class="nr-cb">
      <div class="nr-title">${escapeHtml(job.title)}</div>
      <div class="nr-company">${escapeHtml(job.company)}</div>
      <div class="nr-url">${escapeHtml(urlDisplay)}</div>
      <div class="nr-actions">
        <button class="nr-btn nr-secondary" id="nr-card-pipeline">+ Add to Pipeline</button>
        <button class="nr-btn nr-primary" id="nr-card-evaluate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></svg>
          Evaluate
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(card);

  // Card stays open until user explicitly closes it
  card.querySelector("#nr-card-close").addEventListener("click", removeCard);
  card.querySelector("#nr-card-pipeline").addEventListener("click", () => {
    submitFromCard(job, "pipeline", card);
  });
  card.querySelector("#nr-card-evaluate").addEventListener("click", () => {
    submitFromCard(job, "evaluate", card);
  });
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
      <button class="nr-cx-plain" id="nr-card-close">×</button>
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
  card.querySelector("#nr-card-open-pipeline").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/pipeline` });
    removeCard();
  });
  card.querySelector("#nr-card-fill-app").addEventListener("click", () => {
    removeCard();
    showHelperPanel(job, jobId);
  });
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

function submitFromCard(job, action, card) {
  const pipeBtn = card.querySelector("#nr-card-pipeline");
  const evalBtn = card.querySelector("#nr-card-evaluate");
  if (pipeBtn) pipeBtn.disabled = true;
  if (evalBtn) evalBtn.disabled = true;

  // For evaluate: show in-card loading flow
  if (action === "evaluate") {
    injectStepStyles();
    const body = card.querySelector(".nr-cb");
    if (body) body.innerHTML = `
      <div style="font-size:12.5px;font-weight:500;margin-bottom:2px;">${escapeHtml(job.title)}</div>
      <div style="font-size:12px;color:#6b6358;margin-bottom:4px;">${escapeHtml(job.company)}</div>
      <div class="nr-steps" id="nr-eval-steps">
        <div class="nr-step nr-step-active" id="nr-step-save"><span class="nr-step-dot"></span>Saving job to pipeline…</div>
        <div class="nr-step" id="nr-step-fetch"><span class="nr-step-dot"></span>Fetching your profile</div>
        <div class="nr-step" id="nr-step-eval"><span class="nr-step-dot"></span>Running AI evaluation</div>
        <div class="nr-step" id="nr-step-compare"><span class="nr-step-dot"></span>Comparing with your CV</div>
        <div class="nr-step" id="nr-step-done"><span class="nr-step-dot"></span>Ready</div>
      </div>
      <div id="nr-eval-result-area"></div>
    `;

    function setStep(id, state) {
      const el = card.querySelector(`#${id}`);
      if (!el) return;
      el.className = `nr-step nr-step-${state}`;
      if (state === "done") el.querySelector(".nr-step-dot").style.background = "#2f7a3a";
    }

    // Step 1: submit job
    chrome.runtime.sendMessage(
      { type: "SUBMIT_JOB", job: { title: job.title, company: job.company, url: job.url, description: job.description, source: "extension" } },
      (saveRes) => {
        if (chrome.runtime.lastError || !saveRes?.ok) {
          setStep("nr-step-save", "error");
          card.querySelector("#nr-step-save").lastChild.textContent = saveRes?.error ?? "Save failed — try again";
          if (pipeBtn) pipeBtn.disabled = false;
          if (evalBtn) evalBtn.disabled = false;
          return;
        }

        const jobId = saveRes.job_id;
        if (jobId) {
          chrome.storage.session.set({ nr_last_job_url: job.url, nr_last_job_id: jobId, nr_last_job_title: job.title ?? "", nr_last_company: job.company ?? "" });
        }

        setStep("nr-step-save", "done");
        setStep("nr-step-fetch", "active");

        // Brief pause for visual effect then start eval
        setTimeout(() => {
          setStep("nr-step-fetch", "done");
          setStep("nr-step-eval", "active");

          if (!jobId) {
            setStep("nr-step-eval", "error");
            return;
          }

          // Step 3+4: run evaluation (advance step-compare halfway through wait)
          const compareTimer = setTimeout(() => {
            setStep("nr-step-eval", "done");
            setStep("nr-step-compare", "active");
          }, 8000);

          chrome.runtime.sendMessage({ type: "EVALUATE_JOB", jobId }, (evalRes) => {
            clearTimeout(compareTimer);

            if (chrome.runtime.lastError || !evalRes?.ok) {
              setStep("nr-step-eval", "error");
              setStep("nr-step-compare", "error");
              const area = card.querySelector("#nr-eval-result-area");
              if (area) {
                area.innerHTML = `
                  <div style="font-size:12px;color:#b53a3a;padding:8px 0;">
                    ${escapeHtml(evalRes?.error ?? "Evaluation failed — try again")}
                  </div>
                  ${evalRes?.upgrade ? `
                    <button class="nr-btn nr-primary" id="nr-eval-upgrade" style="margin-top:6px;">Upgrade plan →</button>
                  ` : `
                    <button class="nr-btn nr-secondary" id="nr-eval-retry" style="margin-top:6px;">Open in NextRole →</button>
                  `}
                `;
                area.querySelector("#nr-eval-upgrade")?.addEventListener("click", () => {
                  chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/billing` });
                  removeCard();
                });
                area.querySelector("#nr-eval-retry")?.addEventListener("click", () => {
                  chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/pipeline` });
                  removeCard();
                });
              }
              return;
            }

            setStep("nr-step-compare", "done");
            setStep("nr-step-done", "done");

            const score    = evalRes.score ?? 0;
            const decision = evalRes.decision ?? "watch";
            const summary  = evalRes.blocks?.decision?.rationale ?? evalRes.blocks?.role_fit?.summary ?? "";
            const scoreColor = score >= 3.5 ? "#2f7a3a" : score >= 2.5 ? "#8a6d1a" : "#b53a3a";

            const area = card.querySelector("#nr-eval-result-area");
            if (area) {
              area.innerHTML = `
                <div class="nr-eval-result">
                  <div class="nr-eval-score-row">
                    <span class="nr-eval-score" style="--s-color:${scoreColor}">${score.toFixed(1)}</span>
                    <span class="nr-eval-decision ${decision}">${decision}</span>
                  </div>
                  ${summary ? `<div class="nr-eval-summary">${escapeHtml(summary.slice(0, 120))}${summary.length > 120 ? "…" : ""}</div>` : ""}
                  <button class="nr-btn nr-primary" id="nr-eval-open" style="margin-top:2px;">View full evaluation →</button>
                </div>
              `;
              area.querySelector("#nr-eval-open").addEventListener("click", () => {
                chrome.runtime.sendMessage({
                  type: "OPEN_TAB",
                  url: evalRes.evaluation_id
                    ? `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}&eval=${evalRes.evaluation_id}`
                    : `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}`,
                });
                removeCard();
              });
            }
          });
        }, 900);
      }
    );
    return;
  }

  // Pipeline action: save then show helper panel
  chrome.runtime.sendMessage(
    { type: "SUBMIT_JOB", job: { title: job.title, company: job.company, url: job.url, description: job.description, source: "extension" } },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        if (pipeBtn) pipeBtn.disabled = false;
        if (evalBtn) evalBtn.disabled = false;
        const body = card.querySelector(".nr-cb");
        if (body) {
          const errEl = document.createElement("div");
          errEl.style.cssText = "font-size:12px;color:#b53a3a;margin-top:8px;";
          errEl.textContent = response?.error ?? "Error — try again.";
          body.appendChild(errEl);
          setTimeout(() => errEl.remove(), 4000);
        }
        return;
      }

      const jobId = response.job_id;
      if (jobId) {
        chrome.storage.session.set({ nr_last_job_url: job.url, nr_last_job_id: jobId, nr_last_job_title: job.title ?? "", nr_last_company: job.company ?? "" });
      }

      removeCard();
      showHelperPanel(job, jobId);
    }
  );
}

// ─── Helper panel (Panel B) ───────────────────────────────────────────────────

let _helperResumeHtml = null;

function showHelperPanel(job, jobId) {
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
      <button class="nr-cx" id="nr-helper-close">×</button>
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
      <div id="nr-helper-resume-area"></div>
      <div id="nr-helper-autofill-area"></div>
      <div class="nr-divider"></div>
      <button class="nr-btn nr-ghost" id="nr-helper-open-pipeline">Open Pipeline →</button>
    </div>
  `;
  document.body.appendChild(card);

  card.querySelector("#nr-helper-close").addEventListener("click", removeCard);
  card.querySelector("#nr-helper-open-pipeline").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${NEXTROLE_URL}/dashboard/pipeline` });
    removeCard();
  });

  // Load profile to get tier + usage, then render action buttons
  chrome.runtime.sendMessage({ type: "GET_PROFILE" }, (profileRes) => {
    const tier   = profileRes?.tier   ?? "free";
    const usage  = profileRes?.usage  ?? {};
    const limits = profileRes?.limits ?? {};

    renderResumeButton(card, job, jobId, tier, usage, limits);
    renderAutofillButton(card, job, tier, usage, limits);
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
            <button class="nr-btn nr-primary" id="nr-resume-open" style="flex:1;">Open + Save PDF</button>
            ${res.resume_id ? `<button class="nr-btn nr-secondary" id="nr-resume-dash" style="flex:unset;padding:8px 10px;">View all</button>` : ""}
          </div>
        </div>
      `;
      resultArea.querySelector("#nr-resume-open")?.addEventListener("click", () => {
        const blob = new Blob([_helperResumeHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        chrome.runtime.sendMessage({ type: "OPEN_TAB", url });
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

  // Starter — check daily limit
  const autofillsToday = usage.autofills_today ?? 0;
  const autofillLimit  = limits.autofills_per_day ?? 1;
  const atLimit = tier === "starter" && autofillsToday >= autofillLimit;

  if (atLimit) {
    area.innerHTML = `
      <div class="nr-upgrade-box">
        <div class="nr-ub-title">⚡ Autofill</div>
        <div class="nr-ub-desc">You've used your autofill for today. Upgrade to Pro for unlimited autofill.</div>
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
  const costLabel = tier === "starter" ? "8 credits · 1/day" : "8 credits";

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
  return true;
});

// Returns true if any job was found and card shown.
// Shows card for ALL confidence levels — low-confidence jobs show "Possible Job" label.
function detectAndShow() {
  const job = extractJob();
  if (!job) return false;
  // Badge only for high-confidence (confirmed ATS extractors)
  const isHigh = job.confidence !== "low";
  chrome.runtime.sendMessage({ type: "JOB_DETECTED", found: isHigh });
  showDetectCard(job);
  return true; // stop retrying — we found something
}

// Retry at 1s → 2.5s → 5s after navigation.
// Heavy SPAs (Workday, LinkedIn) can take several seconds to render job content.
let _retryTimer = null;
const RETRY_DELAYS = [1000, 2500, 5000];

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

// Initial detection
detectWithRetry();

// SPA navigation watcher
let _lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== _lastUrl) {
    _lastUrl = location.href;
    detectWithRetry();
  }
}).observe(document.body, { childList: true, subtree: true });
