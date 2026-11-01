"use client";

import type { Chapter, Story } from "./types";
import { formatDate, parseDoc, safeFileName, tiptapToHtml, tiptapToText } from "./utils";
import { genreLabel, sourceLabel, statusLabel } from "./constants";

function chapterBody(chapter: Chapter): string {
  return tiptapToText(parseDoc(chapter.content)).trim();
}

export function storyToText(story: Story, chapters: Chapter[], author: string): string {
  const lines: string[] = [];
  lines.push(story.title.toUpperCase());
  lines.push("");
  lines.push(`oleh ${author || "Tanpa Nama"}`);
  lines.push(
    `${genreLabel(story.genre)} · ${statusLabel(story.status)} · ${sourceLabel(story.source)}`
  );
  lines.push(`Dibuat ${formatDate(story.created_at)} · Diperbarui ${formatDate(story.updated_at)}`);
  lines.push("");
  lines.push("=".repeat(64));
  lines.push("");

  if (story.synopsis) {
    lines.push("SINOPSIS");
    lines.push("");
    lines.push(story.synopsis);
    lines.push("");
    lines.push("=".repeat(64));
    lines.push("");
  }

  for (const chapter of chapters) {
    lines.push(chapter.title.toUpperCase());
    lines.push("");
    lines.push(chapterBody(chapter));
    lines.push("");
    lines.push("-".repeat(32));
    lines.push("");
  }

  return lines.join("\n");
}

export function storyToMarkdown(story: Story, chapters: Chapter[], author: string): string {
  const lines: string[] = [];
  lines.push(`# ${story.title}`);
  lines.push("");
  lines.push(`*oleh ${author || "Tanpa Nama"}*`);
  lines.push("");
  lines.push(
    `> ${genreLabel(story.genre)} · ${statusLabel(story.status)} · ${sourceLabel(story.source)}`
  );
  lines.push("");

  if (story.synopsis) {
    lines.push("## Sinopsis");
    lines.push("");
    lines.push(story.synopsis);
    lines.push("");
  }

  for (const chapter of chapters) {
    lines.push(`## ${chapter.title}`);
    lines.push("");
    lines.push(chapterBody(chapter));
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    `_Diekspor dari TEROR MISTIK pada ${formatDate(new Date().toISOString())}._`
  );

  return lines.join("\n");
}

export function storyToHtml(story: Story, chapters: Chapter[], author: string): string {
  const body = chapters
    .map(
      (chapter) =>
        `<section><h2>${chapter.title}</h2>${tiptapToHtml(parseDoc(chapter.content))}</section>`
    )
    .join("\n");

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${story.title}</title>
<style>
body{max-width:680px;margin:64px auto;padding:0 24px;background:#101014;color:#e8dcc8;font-family:Lora,Georgia,serif;line-height:1.9}
h1{font-family:"Cormorant Garamond",Georgia,serif;font-size:2.6rem;font-weight:300;line-height:1.1}
h2{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.5rem;margin-top:2.5rem}
.meta{color:#a69a8b;font-size:.8rem;letter-spacing:.16em;text-transform:uppercase}
blockquote{border-left:1px solid #a83232;padding-left:1rem;font-style:italic;color:#cfc2ad}
hr{border:none;height:1px;background:#333039;margin:2.4rem auto;width:30%}
</style></head><body>
<h1>${story.title}</h1>
<p class="meta">oleh ${author || "Tanpa Nama"} · ${genreLabel(story.genre)}</p>
${story.synopsis ? `<p><em>${story.synopsis}</em></p>` : ""}
${body}
</body></html>`;
}

export async function downloadDocx(
  story: Story,
  chapters: Chapter[],
  author: string
): Promise<void> {
  const payload = {
    title: story.title,
    author,
    genre: genreLabel(story.genre),
    source: sourceLabel(story.source),
    synopsis: story.synopsis,
    chapters: chapters.map((chapter) => ({
      title: chapter.title,
      body: chapterBody(chapter),
    })),
  };

  const res = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Gagal membuat DOCX.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFileName(story.title)}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
