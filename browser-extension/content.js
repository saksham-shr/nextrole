function textFromSelectors(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return "";
}

function descriptionFromSelectors(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.replace(/\s+/g, " ").trim();
    if (text && text.length > 120) return text;
  }
  return "";
}

function parseLinkedIn() {
  return {
    title: textFromSelectors(["h1", ".job-details-jobs-unified-top-card__job-title", ".top-card-layout__title"]),
    company: textFromSelectors([".job-details-jobs-unified-top-card__company-name a", ".topcard__org-name-link", ".topcard__flavor"]),
    description: descriptionFromSelectors([".jobs-description-content__text", ".description__text", ".show-more-less-html__markup"]),
  };
}

function parseIndeed() {
  return {
    title: textFromSelectors(["h1.jobsearch-JobInfoHeader-title", "h1[data-testid='jobsearch-JobInfoHeader-title']", "h1"]),
    company: textFromSelectors(["[data-testid='inlineHeader-companyName']", ".jobsearch-CompanyInfoWithoutHeaderImage div", "[data-company-name='true']"]),
    description: descriptionFromSelectors(["#jobDescriptionText", "[data-testid='jobsearch-JobComponent-description']"]),
  };
}

function parseGreenhouse() {
  return {
    title: textFromSelectors(["h1.app-title", "#header h1", "h1"]),
    company: textFromSelectors(["#logo", ".company-name", "meta[property='og:site_name']"]),
    description: descriptionFromSelectors(["#content", ".content", ".section-wrapper"]),
  };
}

function parseLever() {
  return {
    title: textFromSelectors([".posting-headline h2", "h2", "h1"]),
    company: textFromSelectors([".main-header-text", ".posting-categories .sort-by-time", "meta[property='og:site_name']"]),
    description: descriptionFromSelectors([".posting-description", ".section-wrapper"]),
  };
}

function parseWorkday() {
  return {
    title: textFromSelectors(["h2[data-automation-id='jobPostingHeader']", "h1", "h2"]),
    company: textFromSelectors(["[data-automation-id='companyName']", "[data-automation-id='locations']", "title"]),
    description: descriptionFromSelectors(["[data-automation-id='jobPostingDescription']", "main"]),
  };
}

function parseGeneric() {
  return {
    title: textFromSelectors(["h1", "title"]),
    company: "",
    description: descriptionFromSelectors(["main", "article", "body"]),
  };
}

function parseJobFromPage() {
  const host = location.hostname;
  let parsed;

  if (host.includes("linkedin.com")) parsed = parseLinkedIn();
  else if (host.includes("indeed.")) parsed = parseIndeed();
  else if (host.includes("greenhouse.io")) parsed = parseGreenhouse();
  else if (host.includes("lever.co")) parsed = parseLever();
  else if (host.includes("myworkdayjobs.com")) parsed = parseWorkday();
  else parsed = parseGeneric();

  return {
    ...parsed,
    url: location.href,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "NEXTROLE_PARSE_JOB") return;

  try {
    const job = parseJobFromPage();
    sendResponse({ ok: true, job });
  } catch (error) {
    sendResponse({ ok: false, error: error?.message || "Parse failed" });
  }

  return true;
});
