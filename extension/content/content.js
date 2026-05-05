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
      if (Array.isArray(data)) data = data.find((d) => d["@type"] === "JobPosting") ?? null;
      if (data?.["@graph"]) data = data["@graph"].find((d) => d["@type"] === "JobPosting") ?? null;
      if (!data || data["@type"] !== "JobPosting") continue;

      const title = data.title ?? data.name ?? null;
      const company = data.hiringOrganization?.name ?? data.hiringOrganization ?? null;
      const ldDesc = typeof data.description === "string"
        ? cleanText(data.description.replace(/<[^>]+>/g, " "))
        : null;

      if (title) {
        return { title, company: company ?? companyFromDomain(), description: ldDesc, confidence: "high", source: "schema.org" };
      }
    } catch {}
  }
  return null;
}

// ─── Extractor 2: LinkedIn ────────────────────────────────────────────────────

function fromLinkedIn() {
  if (!location.hostname.includes("linkedin.com")) return null;

  const title = texts([
    ".job-details-jobs-unified-top-card__job-title h1",
    ".job-details-jobs-unified-top-card__job-title",
    ".topcard__title",
    "h1",
  ]);

  const company = texts([
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    ".topcard__flavor--black-link",
  ]);

  // LinkedIn truncates with .show-more-less-html — grab both variants and pick longer
  const descA = texts([
    ".show-more-less-html__markup--more",   // expanded state
    ".show-more-less-html__markup",          // any state
    ".jobs-description__content",
    ".description__text",
  ]);
  // Also try the raw innerHTML → strip tags (catches content hidden by max-height CSS)
  const descEl = document.querySelector(".jobs-box__html-content") ??
    document.querySelector(".jobs-description-content__text");
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

  if (title) {
    return { title, company: company ?? companyFromDomain(), description: cleanText(description), confidence: "high", source: "indeed" };
  }
  return null;
}

// ─── Extractor 4: Glassdoor ───────────────────────────────────────────────────

function fromGlassdoor() {
  if (!location.hostname.includes("glassdoor.com")) return null;

  const title = texts([
    '[data-test="job-title"]',
    ".job-title",
    "h1",
  ]);

  const company = texts([
    '[data-test="employer-name"]',
    ".employer-name",
  ]);

  const descEl = document.querySelector('[class*="JobDetails_jobDescription"]') ??
    document.querySelector('[class*="jobDescriptionContent"]') ??
    document.querySelector('[class*="jobDescription"]') ??
    document.querySelector(".desc");

  // Glassdoor often has full HTML — strip tags for plain text
  const description = descEl
    ? cleanText(descEl.innerHTML.replace(/<[^>]+>/g, " "))
    : null;

  if (title) {
    return { title, company: company ?? companyFromDomain(), description, confidence: "high", source: "glassdoor" };
  }
  return null;
}

// ─── Extractor 5: Lever ───────────────────────────────────────────────────────

function fromLever() {
  if (!location.hostname.includes("lever.co")) return null;

  const title = texts([
    "[data-qa='posting-name']",
    ".posting-headline h2",
    "h2",
    "h1",
  ]);

  const pathParts = location.pathname.split("/").filter(Boolean);
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
  if (
    !location.hostname.includes("greenhouse.io") &&
    !location.hostname.includes("grnh.se")
  ) return null;

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

  const title = texts([
    "h1",
    ".ashby-job-posting-heading",
    '[class*="jobPosting"] h1',
  ]);

  const pathParts = location.pathname.split("/").filter(Boolean);
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
  if (!location.hostname.includes("myworkdayjobs.com") && !location.hostname.includes("workday.com")) return null;

  const title = texts([
    '[data-automation-id="jobPostingHeader"]',
    "h2[data-automation-id]",
    "h1",
  ]);

  const company = metaContent("og:site_name") ?? companyFromDomain();

  const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]') ??
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

  if (title) {
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

// ─── Extractor 13: Heuristic fallback (any job site) ─────────────────────────

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

// ─── Floating detection card ──────────────────────────────────────────────────

function injectCardStyles() {
  if (document.getElementById("nr-card-styles")) return;
  const s = document.createElement("style");
  s.id = "nr-card-styles";
  s.textContent = `
    #nr-detect-card {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      width: 300px;
      background: #fffdf8;
      border: 1.5px solid #2a2620;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(26,24,20,0.22);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px;
      color: #1a1814;
      overflow: hidden;
      animation: nr-card-in 0.25s ease;
    }
    @keyframes nr-card-in {
      from { transform: translateY(16px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    #nr-detect-card .nr-ch {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px;
      background: #c84a1f; color: #fffdf8;
    }
    #nr-detect-card .nr-brand {
      display: flex; align-items: center; gap: 6px;
      font-size: 10px; font-family: monospace;
      letter-spacing: 0.12em; text-transform: uppercase;
    }
    #nr-detect-card .nr-cx {
      background: none; border: none; color: rgba(255,253,248,0.7);
      cursor: pointer; font-size: 15px; line-height: 1;
      padding: 2px 4px; border-radius: 4px;
    }
    #nr-detect-card .nr-cx:hover { color: #fffdf8; }
    #nr-detect-card .nr-cb { padding: 12px; }
    #nr-detect-card .nr-title {
      font-weight: 600; font-size: 13.5px;
      margin-bottom: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nr-detect-card .nr-company {
      color: #6b6358; font-size: 12px; margin-bottom: 12px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nr-detect-card .nr-actions { display: flex; gap: 6px; }
    #nr-detect-card .nr-btn {
      flex: 1; padding: 8px 10px; border-radius: 8px; border: none;
      font-family: monospace; font-size: 10px; font-weight: 500;
      letter-spacing: 0.12em; text-transform: uppercase;
      cursor: pointer; transition: opacity 0.15s;
    }
    #nr-detect-card .nr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #nr-detect-card .nr-btn:hover:not(:disabled) { opacity: 0.85; }
    #nr-detect-card .nr-primary { background: #c84a1f; color: #fffdf8; }
    #nr-detect-card .nr-secondary { background: #f0ebe3; color: #2a2620; }
    #nr-detect-card .nr-conf {
      font-size: 10px; color: #9a9286; margin-top: 8px; text-align: center;
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

function showDetectCard(job) {
  removeCard();
  injectCardStyles();

  const card = document.createElement("div");
  card.id = "nr-detect-card";
  card.innerHTML = `
    <div class="nr-ch">
      <div class="nr-brand">
        <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="rgba(255,253,248,0.15)"/>
          <path d="M20 14L44 32L20 50" stroke="#fffdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        NextRole · Job Detected
      </div>
      <button class="nr-cx" id="nr-card-close">×</button>
    </div>
    <div class="nr-cb">
      <div class="nr-title">${escapeHtml(job.title)}</div>
      <div class="nr-company">${escapeHtml(job.company)}</div>
      <div class="nr-actions">
        <button class="nr-btn nr-primary" id="nr-card-pipeline">+ Add to Pipeline</button>
        <button class="nr-btn nr-secondary" id="nr-card-evaluate">Evaluate</button>
      </div>
      <div class="nr-conf" id="nr-card-status">Auto-dismisses in 10s</div>
    </div>
  `;
  document.body.appendChild(card);

  // Countdown display
  let secs = 10;
  const statusEl = card.querySelector("#nr-card-status");
  const countdown = setInterval(() => {
    secs--;
    if (statusEl && secs > 0) statusEl.textContent = `Auto-dismisses in ${secs}s`;
  }, 1000);

  _cardTimer = setTimeout(() => { clearInterval(countdown); removeCard(); }, 10000);

  card.querySelector("#nr-card-close").addEventListener("click", () => {
    clearInterval(countdown); removeCard();
  });

  card.querySelector("#nr-card-pipeline").addEventListener("click", () => {
    clearInterval(countdown);
    submitFromCard(job, "pipeline", card);
  });

  card.querySelector("#nr-card-evaluate").addEventListener("click", () => {
    clearInterval(countdown);
    submitFromCard(job, "evaluate", card);
  });
}

function submitFromCard(job, action, card) {
  clearTimeout(_cardTimer);
  const pipeBtn = card.querySelector("#nr-card-pipeline");
  const evalBtn = card.querySelector("#nr-card-evaluate");
  const statusEl = card.querySelector("#nr-card-status");
  if (pipeBtn) pipeBtn.disabled = true;
  if (evalBtn) evalBtn.disabled = true;
  if (statusEl) statusEl.textContent = "Saving…";

  chrome.runtime.sendMessage(
    {
      type: "SUBMIT_JOB",
      job: {
        title:       job.title,
        company:     job.company,
        url:         job.url,
        description: job.description,
        source:      "extension",
      },
    },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        if (statusEl) statusEl.textContent = response?.error ?? "Error — try again.";
        if (pipeBtn) pipeBtn.disabled = false;
        if (evalBtn) evalBtn.disabled = false;
        _cardTimer = setTimeout(removeCard, 4000);
        return;
      }

      const jobId = response.job_id;
      if (statusEl) statusEl.textContent = "✓ Saved!";

      setTimeout(() => {
        removeCard();
        if (action === "evaluate" && jobId) {
          chrome.runtime.sendMessage({
            type: "OPEN_TAB",
            url: `${NEXTROLE_URL}/dashboard/pipeline?job=${jobId}&action=evaluate`,
          });
        }
      }, 800);
    }
  );
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_JOB") {
    sendResponse({ job: extractJob() });
  }
  return true;
});

function detectAndShow() {
  const job = extractJob();
  chrome.runtime.sendMessage({ type: "JOB_DETECTED", found: !!job });
  if (job) showDetectCard(job);
}

// Initial detection
detectAndShow();

// SPA navigation watcher
let _lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== _lastUrl) {
    _lastUrl = location.href;
    setTimeout(detectAndShow, 1500);
  }
}).observe(document.body, { childList: true, subtree: true });
