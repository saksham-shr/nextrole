export interface ResumeContact {
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  location?: string;
}

export interface ResumeExperience {
  role: string;
  company: string;
  period: string;
  location?: string;
  bullets: string[];
}

export interface ResumeProject {
  title: string;
  description: string;
  tech?: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  year?: string;
}

export interface ResumeCertification {
  title: string;
  issuer?: string;
  year?: string;
}

export interface ResumeData {
  name: string;
  contact: ResumeContact;
  summary: string;
  competencies: string[];
  experience: ResumeExperience[];
  projects?: ResumeProject[];
  education?: ResumeEducation[];
  certifications?: ResumeCertification[];
  skills?: Record<string, string[]>;
  coverage: number;
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // ATS normalization
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/ /g, " ");
}

function contactLine(c: ResumeContact): string {
  const parts: string[] = [];
  if (c.email) parts.push(`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`);
  if (c.phone) parts.push(esc(c.phone));
  if (c.location) parts.push(esc(c.location));
  if (c.linkedin)
    parts.push(`<a href="${esc(c.linkedin)}">${esc(c.linkedin).replace(/^https?:\/\//, "")}</a>`);
  if (c.github)
    parts.push(`<a href="${esc(c.github)}">${esc(c.github).replace(/^https?:\/\//, "")}</a>`);
  if (c.portfolio)
    parts.push(
      `<a href="${esc(c.portfolio)}">${esc(c.portfolio).replace(/^https?:\/\//, "")}</a>`,
    );
  return parts.join(" &nbsp;·&nbsp; ");
}

export function renderResumeHtml(data: ResumeData): string {
  const expHtml = data.experience
    .map(
      (e) => `
    <div class="job">
      <div class="job-header">
        <div>
          <span class="job-role">${esc(e.role)}</span>
          <span class="job-company"> · ${esc(e.company)}</span>
        </div>
        <span class="job-meta">${esc(e.period)}${e.location ? ` · ${esc(e.location)}` : ""}</span>
      </div>
      <ul class="bullets">
        ${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("\n        ")}
      </ul>
    </div>`,
    )
    .join("\n");

  const projectsHtml =
    data.projects && data.projects.length > 0
      ? `<div class="section">
    <div class="section-title">Projects</div>
    ${data.projects
      .map(
        (p) => `
    <div class="project">
      <span class="project-title">${esc(p.title)}</span>
      <span class="project-desc"> — ${esc(p.description)}</span>
      ${
        p.tech && p.tech.length > 0
          ? `<div class="tech-tags">${p.tech.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`
          : ""
      }
    </div>`,
      )
      .join("\n")}
  </div>`
      : "";

  const eduHtml =
    data.education && data.education.length > 0
      ? `<div class="section">
    <div class="section-title">Education</div>
    ${data.education
      .map(
        (e) => `
    <div class="edu-item">
      <span class="edu-degree">${esc(e.degree)}</span>
      <span class="edu-meta"> · ${esc(e.institution)}${e.year ? ` · ${esc(e.year)}` : ""}</span>
    </div>`,
      )
      .join("\n")}
  </div>`
      : "";

  const certsHtml =
    data.certifications && data.certifications.length > 0
      ? `<div class="section">
    <div class="section-title">Certifications</div>
    ${data.certifications
      .map(
        (c) => `
    <div class="cert-item">
      <span class="cert-title">${esc(c.title)}</span>
      ${c.issuer ? `<span class="cert-meta"> · ${esc(c.issuer)}</span>` : ""}
      ${c.year ? `<span class="cert-meta"> · ${esc(c.year)}</span>` : ""}
    </div>`,
      )
      .join("\n")}
  </div>`
      : "";

  const skillsHtml =
    data.skills && Object.keys(data.skills).length > 0
      ? `<div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-grid">
    ${Object.entries(data.skills)
      .map(
        ([cat, items]) =>
          `<div class="skill-row"><span class="skill-cat">${esc(cat)}</span><span class="skill-items">${items.map(esc).join(", ")}</span></div>`,
      )
      .join("\n    ")}
    </div>
  </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.name)} — Resume</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --accent: hsl(187, 74%, 32%);
    --accent-bg: hsl(187, 40%, 95%);
    --text: #1a1a2e;
    --muted: #555;
    --light: #888;
    --line: #dde;
  }
  body {
    font-family: "DM Sans", system-ui, sans-serif;
    font-size: 11px;
    line-height: 1.55;
    color: var(--text);
    background: #fff;
    max-width: 820px;
    margin: 0 auto;
    padding: 28px 32px;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  a { color: var(--accent); text-decoration: none; }
  /* Header */
  .header { margin-bottom: 18px; border-bottom: 2px solid var(--accent); padding-bottom: 12px; }
  .candidate-name {
    font-family: "Space Grotesk", sans-serif;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: var(--text);
    margin-bottom: 5px;
  }
  .contact-line { font-size: 10px; color: var(--muted); }
  /* Section */
  .section { margin-bottom: 16px; break-inside: avoid; }
  .section-title {
    font-family: "Space Grotesk", sans-serif;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--accent);
    border-bottom: 1px solid var(--line);
    padding-bottom: 3px;
    margin-bottom: 9px;
  }
  /* Summary */
  .summary { font-size: 11px; color: var(--muted); line-height: 1.6; }
  /* Competencies */
  .competencies { display: flex; flex-wrap: wrap; gap: 4px; }
  .comp-tag {
    background: var(--accent-bg);
    color: var(--accent);
    font-size: 9.5px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 100px;
  }
  /* Experience */
  .job { margin-bottom: 11px; break-inside: avoid; }
  .job-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .job-role { font-family: "Space Grotesk", sans-serif; font-weight: 600; font-size: 11.5px; }
  .job-company { color: var(--muted); }
  .job-meta { font-size: 10px; color: var(--light); white-space: nowrap; }
  .bullets { margin-left: 16px; }
  .bullets li { margin-bottom: 2px; font-size: 10.5px; }
  /* Projects */
  .project { margin-bottom: 7px; break-inside: avoid; }
  .project-title { font-weight: 600; font-size: 11px; }
  .project-desc { color: var(--muted); }
  .tech-tags { margin-top: 3px; display: flex; flex-wrap: wrap; gap: 3px; }
  .tag { background: var(--accent-bg); color: var(--accent); font-size: 9px; padding: 1px 6px; border-radius: 100px; }
  /* Education */
  .edu-item { margin-bottom: 5px; }
  .edu-degree { font-weight: 500; }
  .edu-meta { color: var(--muted); }
  /* Certs */
  .cert-item { margin-bottom: 4px; }
  .cert-title { font-weight: 500; }
  .cert-meta { color: var(--muted); }
  /* Skills */
  .skills-grid { display: flex; flex-direction: column; gap: 4px; }
  .skill-row { display: flex; gap: 8px; }
  .skill-cat { font-weight: 600; min-width: 110px; color: var(--muted); }
  .skill-items { color: var(--text); }
  /* Print */
  @media print {
    body { padding: 0; max-width: none; }
    @page { margin: 18mm 16mm; size: A4; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="candidate-name">${esc(data.name)}</div>
    <div class="contact-line">${contactLine(data.contact)}</div>
  </div>

  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">${esc(data.summary)}</p>
  </div>

  <div class="section">
    <div class="section-title">Core Competencies</div>
    <div class="competencies">
      ${data.competencies.map((c) => `<span class="comp-tag">${esc(c)}</span>`).join("\n      ")}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Experience</div>
    ${expHtml}
  </div>

  ${projectsHtml}
  ${eduHtml}
  ${certsHtml}
  ${skillsHtml}
</body>
</html>`;
}
