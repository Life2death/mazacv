import { notFound } from "next/navigation";
import type { JsonResume } from "@/lib/types";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPage(slug: string) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb
    .from("resume_pages")
    .select("parsed_resume, template_id, accent_color, published")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || !data.published) return null;
  return data;
}

export default async function PublicResumePage({ params }: { params: { slug: string } }) {
  const data = await getPage(params.slug);
  if (!data) notFound();

  const resume = data.parsed_resume as JsonResume;
  const templateName = TEMPLATES.find((t) => t.id === data.template_id)?.name ?? "Classic";
  const name = resume.basics?.name ?? "Resume";
  const headline = resume.basics?.headline ?? "";
  const pdfUrl = `/api/resume-pages/${params.slug}/pdf`;

  return (
    <html lang="en">
      <head>
        <title>{name} — MazaCV</title>
        <meta name="description" content={`${name}${headline ? ` — ${headline}` : ""} — Powered by MazaCV`} />
        <meta name="robots" content="noindex" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lexend:wght@700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', system-ui, sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; flex-direction: column; }
          .header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
          .header h1 { font-family: 'Lexend', sans-serif; font-size: 18px; color: #0f172a; }
          .header .meta { font-size: 13px; color: #64748b; }
          .header .actions { display: flex; gap: 8px; }
          .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; transition: all 0.15s; }
          .btn-primary { background: #4f46e5; color: white; }
          .btn-primary:hover { background: #4338ca; }
          .btn-outline { background: white; color: #475569; border: 1px solid #e2e8f0; }
          .btn-outline:hover { background: #f8fafc; }
          .viewer { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
          .viewer embed { width: 100%; max-width: 900px; height: calc(100vh - 100px); border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .footer { text-align: center; padding: 12px; font-size: 12px; color: #94a3b8; }
          .footer a { color: #4f46e5; text-decoration: none; }
          @media (max-width: 640px) {
            .header { flex-direction: column; gap: 8px; text-align: center; }
            .viewer { padding: 8px; }
            .viewer embed { height: calc(100vh - 140px); border-radius: 8px; }
          }
        `}</style>
      </head>
      <body>
        <header className="header">
          <div>
            <h1>{name}</h1>
            {headline && <p className="meta">{headline}</p>}
            <p className="meta">{templateName} template</p>
          </div>
          <div className="actions">
            <a href={pdfUrl} download className="btn btn-primary">
              Download PDF
            </a>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); }} className="btn btn-outline">
              Copy link
            </button>
          </div>
        </header>
        <main className="viewer">
          <embed src={pdfUrl} type="application/pdf" />
        </main>
        <footer className="footer">
          Made with <a href="https://mazacv.in">MazaCV</a> — apna resume score karo, AI se tailor karo
        </footer>

        <script dangerouslySetInnerHTML={{
          __html: `
            document.querySelector('button').addEventListener('click', function() {
              navigator.clipboard.writeText(window.location.href);
              var t = this.textContent;
              this.textContent = 'Copied!';
              setTimeout(function() { this.textContent = t; }.bind(this), 2000);
            });
          `
        }} />
      </body>
    </html>
  );
}
