import type { ResumeData } from "@/lib/resume/template";

function esc(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\line ");
}

function line(value = ""): string {
  return `${esc(value)}\\line `;
}

export function renderResumeRtf(data: ResumeData): string {
  const sections: string[] = [];

  sections.push("\\b " + esc(data.name) + "\\b0\\line ");

  const contact = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.linkedin,
    data.contact.github,
    data.contact.portfolio,
  ].filter(Boolean).join(" | ");
  if (contact) sections.push(line(contact));
  sections.push("\\line ");

  if (data.summary) {
    sections.push("\\b Summary\\b0\\line ");
    sections.push(line(data.summary));
    sections.push("\\line ");
  }

  if (data.competencies?.length) {
    sections.push("\\b Competencies\\b0\\line ");
    sections.push(line(data.competencies.join(", ")));
    sections.push("\\line ");
  }

  if (data.experience?.length) {
    sections.push("\\b Experience\\b0\\line ");
    for (const exp of data.experience) {
      sections.push(`\\b ${esc(exp.role)}\\b0  | ${esc(exp.company)}\\line `);
      if (exp.period || exp.location) {
        sections.push(line([exp.period, exp.location].filter(Boolean).join(" | ")));
      }
      for (const bullet of exp.bullets ?? []) {
        sections.push(`\\tab - ${esc(bullet)}\\line `);
      }
      sections.push("\\line ");
    }
  }

  if (data.projects?.length) {
    sections.push("\\b Projects\\b0\\line ");
    for (const project of data.projects) {
      sections.push(`\\b ${esc(project.title)}\\b0\\line `);
      sections.push(line(project.description));
      if (project.tech?.length) sections.push(line(`Tech: ${project.tech.join(", ")}`));
      sections.push("\\line ");
    }
  }

  if (data.education?.length) {
    sections.push("\\b Education\\b0\\line ");
    for (const edu of data.education) {
      sections.push(line([edu.degree, edu.institution, edu.year].filter(Boolean).join(" | ")));
    }
    sections.push("\\line ");
  }

  if (data.certifications?.length) {
    sections.push("\\b Certifications\\b0\\line ");
    for (const cert of data.certifications) {
      sections.push(line([cert.title, cert.issuer, cert.year].filter(Boolean).join(" | ")));
    }
    sections.push("\\line ");
  }

  if (data.skills && Object.keys(data.skills).length > 0) {
    sections.push("\\b Skills\\b0\\line ");
    for (const [category, items] of Object.entries(data.skills)) {
      sections.push(line(`${category}: ${items.join(", ")}`));
    }
  }

  return `{\\rtf1\\ansi\\deff0 ${sections.join("")}}`;
}
