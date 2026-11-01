"use client";

import { docFromText, countWords } from "@/lib/utils";
import type { Repository } from "@/lib/data/repository";
import type { Note, Story } from "@/lib/types";

export async function convertNoteToStory(
  repo: Repository,
  note: Note,
  titleOverride?: string
): Promise<Story> {
  const title = (titleOverride || note.title || "Cerita Baru").slice(0, 180);
  const story = await repo.createStory({
    title,
    source: note.method === "video" ? "media" : "lisan",
    synopsis: "",
  });

  const chapters = await repo.listChapters(story.id);
  const doc = docFromText(note.body);
  if (chapters[0]) {
    await repo.updateChapter(chapters[0].id, {
      content: JSON.stringify(doc),
      word_count: countWords(note.body),
    });
  }

  await repo.updateNote(note.id, { status: "converted", story_id: story.id });
  return story;
}
