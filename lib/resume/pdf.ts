import React from "react";
import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume/template";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 34,
    paddingBottom: 34,
    paddingLeft: 34,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    color: "#1a1a2e",
    backgroundColor: "#ffffff",
  },
  header: {
    paddingBottom: 10,
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#167987",
  },
  name: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  contact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    color: "#555555",
    fontSize: 9,
  },
  link: {
    color: "#167987",
    textDecoration: "none",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#167987",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingBottom: 3,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#ddddee",
  },
  summary: {
    color: "#555555",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    paddingTop: 2,
    paddingRight: 6,
    paddingBottom: 2,
    paddingLeft: 6,
    borderRadius: 999,
    backgroundColor: "#edf8fa",
    color: "#167987",
    fontSize: 8.5,
  },
  job: {
    marginBottom: 9,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 3,
  },
  jobTitle: {
    flex: 1,
    fontSize: 10.5,
  },
  strong: {
    fontFamily: "Helvetica-Bold",
  },
  muted: {
    color: "#666666",
  },
  meta: {
    color: "#888888",
    fontSize: 9,
    textAlign: "right",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 2,
  },
  bulletDot: {
    width: 8,
    color: "#167987",
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
  },
  item: {
    marginBottom: 5,
  },
  skillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 3,
  },
  skillCat: {
    width: 95,
    fontFamily: "Helvetica-Bold",
    color: "#555555",
  },
  skillItems: {
    flex: 1,
  },
});

function clean(value: string | undefined | null): string {
  return (value ?? "")
    .replace(/[â€“â€”]/g, "-")
    .replace(/[â€˜â€™]/g, "'")
    .replace(/[â€œâ€]/g, '"')
    .replace(/â€¦/g, "...")
    .replace(/Â·/g, "-")
    .replace(/Â /g, " ")
    .trim();
}

function contactItems(data: ResumeData): Array<{ label: string; href?: string }> {
  const c = data.contact ?? {};
  return [
    c.email ? { label: c.email, href: `mailto:${c.email}` } : null,
    c.phone ? { label: c.phone } : null,
    c.location ? { label: c.location } : null,
    c.linkedin ? { label: c.linkedin.replace(/^https?:\/\//, ""), href: c.linkedin } : null,
    c.github ? { label: c.github.replace(/^https?:\/\//, ""), href: c.github } : null,
    c.portfolio ? { label: c.portfolio.replace(/^https?:\/\//, ""), href: c.portfolio } : null,
  ].filter(Boolean) as Array<{ label: string; href?: string }>;
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return React.createElement(
    View,
    { style: styles.section },
    React.createElement(Text, { style: styles.sectionTitle }, title),
    children,
  );
}

function ResumeDocument({ data }: { data: ResumeData }) {
  const contacts = contactItems(data);
  const hasProjects = Array.isArray(data.projects) && data.projects.length > 0;
  const hasEducation = Array.isArray(data.education) && data.education.length > 0;
  const hasCerts = Array.isArray(data.certifications) && data.certifications.length > 0;
  const skillEntries = Object.entries(data.skills ?? {}).filter(([, items]) => items.length > 0);

  return React.createElement(
    Document,
    { title: `${clean(data.name)} Resume`, author: clean(data.name) },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header, wrap: false },
        React.createElement(Text, { style: styles.name }, clean(data.name)),
        React.createElement(
          View,
          { style: styles.contact },
          contacts.map((item, index) => React.createElement(
            React.Fragment,
            { key: `${item.label}-${index}` },
            index > 0 ? React.createElement(Text, null, " - ") : null,
            item.href
              ? React.createElement(Link, { src: item.href, style: styles.link }, clean(item.label))
              : React.createElement(Text, null, clean(item.label)),
          )),
        ),
      ),
      React.createElement(
        Section,
        { title: "Professional Summary" },
        React.createElement(Text, { style: styles.summary }, clean(data.summary)),
      ),
      React.createElement(
        Section,
        { title: "Core Competencies" },
        React.createElement(
          View,
          { style: styles.tagWrap },
          (data.competencies ?? []).map((item) =>
            React.createElement(Text, { key: item, style: styles.tag }, clean(item)),
          ),
        ),
      ),
      React.createElement(
        Section,
        { title: "Experience" },
        (data.experience ?? []).map((job, index) => React.createElement(
          View,
          { key: `${job.company}-${job.role}-${index}`, style: styles.job, wrap: false },
          React.createElement(
            View,
            { style: styles.jobHeader },
            React.createElement(
              Text,
              { style: styles.jobTitle },
              React.createElement(Text, { style: styles.strong }, clean(job.role)),
              React.createElement(Text, { style: styles.muted }, ` - ${clean(job.company)}`),
            ),
            React.createElement(
              Text,
              { style: styles.meta },
              clean(`${job.period}${job.location ? ` - ${job.location}` : ""}`),
            ),
          ),
          (job.bullets ?? []).map((bullet, bulletIndex) => React.createElement(
            View,
            { key: `${index}-${bulletIndex}`, style: styles.bulletRow },
            React.createElement(Text, { style: styles.bulletDot }, "-"),
            React.createElement(Text, { style: styles.bulletText }, clean(bullet)),
          )),
        )),
      ),
      hasProjects
        ? React.createElement(
            Section,
            { title: "Projects" },
            data.projects?.map((project, index) => React.createElement(
              View,
              { key: `${project.title}-${index}`, style: styles.item, wrap: false },
              React.createElement(
                Text,
                null,
                React.createElement(Text, { style: styles.strong }, clean(project.title)),
                React.createElement(Text, { style: styles.muted }, ` - ${clean(project.description)}`),
              ),
              project.tech?.length
                ? React.createElement(Text, { style: styles.muted }, clean(project.tech.join(", ")))
                : null,
            )),
          )
        : null,
      hasEducation
        ? React.createElement(
            Section,
            { title: "Education" },
            data.education?.map((edu, index) => React.createElement(
              Text,
              { key: `${edu.institution}-${index}`, style: styles.item },
              React.createElement(Text, { style: styles.strong }, clean(edu.degree)),
              React.createElement(Text, { style: styles.muted }, ` - ${clean(edu.institution)}${edu.year ? ` - ${clean(edu.year)}` : ""}`),
            )),
          )
        : null,
      hasCerts
        ? React.createElement(
            Section,
            { title: "Certifications" },
            data.certifications?.map((cert, index) => React.createElement(
              Text,
              { key: `${cert.title}-${index}`, style: styles.item },
              React.createElement(Text, { style: styles.strong }, clean(cert.title)),
              React.createElement(Text, { style: styles.muted }, clean(`${cert.issuer ? ` - ${cert.issuer}` : ""}${cert.year ? ` - ${cert.year}` : ""}`)),
            )),
          )
        : null,
      skillEntries.length > 0
        ? React.createElement(
            Section,
            { title: "Skills" },
            skillEntries.map(([category, items]) => React.createElement(
              View,
              { key: category, style: styles.skillRow },
              React.createElement(Text, { style: styles.skillCat }, clean(category)),
              React.createElement(Text, { style: styles.skillItems }, clean(items.join(", "))),
            )),
          )
        : null,
    ),
  );
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function renderResumePdf(data: ResumeData): Promise<Buffer> {
  const document = React.createElement(ResumeDocument, { data }) as React.ReactElement<
    React.ComponentProps<typeof Document>
  >;
  const stream = await pdf(document).toBuffer();
  return streamToBuffer(stream);
}
