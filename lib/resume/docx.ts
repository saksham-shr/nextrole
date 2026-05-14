import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ResumeData } from "@/lib/resume/template";

function resolveBundledPython() {
  return path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "python.exe",
  );
}

export async function renderResumeDocx(data: ResumeData): Promise<Buffer> {
  const python = resolveBundledPython();
  const script = path.join(process.cwd(), "scripts", "render_resume_docx.py");

  return new Promise((resolve, reject) => {
    const child = spawn(python, [script], { stdio: ["pipe", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(new Error(Buffer.concat(stderr).toString("utf8") || `DOCX renderer exited with ${code}`));
    });

    child.stdin.end(JSON.stringify(data));
  });
}
