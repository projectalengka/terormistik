export interface ParsedChapter {
  title: string;
  body: string;
}

const CHAPTER_HEADING = /^\s*(?:BAB|Bab)\s+([0-9]+|[IVXLCDM]+)\b[\s:.—-]*(.*)$/;

export function parseChapters(text: string): ParsedChapter[] {
  const lines = text.split(/\r?\n/);
  const chapters: ParsedChapter[] = [];
  let current: ParsedChapter | null = null;
  let expectTitle = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const match = line.match(CHAPTER_HEADING);

    if (match) {
      if (current) chapters.push(current);
      const inlineTitle = match[2]?.trim() ?? "";
      current = { title: inlineTitle, body: "" };
      expectTitle = inlineTitle.length === 0;
      continue;
    }

    if (!current) {
      if (line.trim()) {
        current = { title: "Bab 1", body: `${line}\n` };
      }
      continue;
    }

    if (expectTitle) {
      if (line.trim()) {
        current.title = line.trim();
        expectTitle = false;
      }
      continue;
    }

    current.body += `${line}\n`;
  }

  if (current) chapters.push(current);

  return chapters
    .map((chapter, index) => ({
      title: chapter.title.trim() || `Bab ${index + 1}`,
      body: chapter.body.trim(),
    }))
    .filter((chapter) => chapter.body.length > 0);
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
