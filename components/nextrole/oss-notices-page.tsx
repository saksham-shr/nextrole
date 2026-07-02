import Link from "next/link";

const mitNotice = `MIT License

Copyright (c) 2026 Santiago Fernandez de Valderrama

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export function OpenSourceNoticesPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white">
          Back to site
        </Link>
        <h1 className="mt-6 text-4xl font-semibold text-white">Open source notices</h1>
        <p className="mt-4 text-lg leading-8 text-zinc-300">
          This page contains third-party attribution notices relevant to the product.
        </p>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Career Ops attribution</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Braevity includes ideas and adaptations derived from Career Ops by Santiago
            Fernandez de Valderrama. Career Ops is distributed under the MIT license.
          </p>
          <pre className="mt-6 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-zinc-200">
            {mitNotice}
          </pre>
        </section>
      </div>
    </main>
  );
}
