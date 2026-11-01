import type {
  AiHistoryEntry,
  BackupPayload,
  Chapter,
  DataMode,
  MediaSource,
  Note,
  Profile,
  ReadingProgress,
  Story,
  StoryVersion,
} from "../types";

export type StoryInput = Partial<Story> & { title: string };
export type ChapterInput = Partial<Chapter> & { story_id: string; title: string };

export interface UploadResult {
  path: string;
  size: number;
  mime: string;
}

export interface Repository {
  readonly mode: DataMode;

  /* Profile */
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Profile>): Promise<Profile>;

  /* Stories */
  listStories(): Promise<Story[]>;
  getStory(id: string): Promise<Story | null>;
  createStory(input: StoryInput): Promise<Story>;
  updateStory(id: string, patch: Partial<Story>): Promise<Story>;
  deleteStory(id: string): Promise<void>;

  /* Chapters */
  listChapters(storyId: string): Promise<Chapter[]>;
  createChapter(storyId: string, title: string): Promise<Chapter>;
  updateChapter(id: string, patch: Partial<Chapter>): Promise<Chapter>;
  deleteChapter(id: string): Promise<void>;
  reorderChapters(storyId: string, orderedIds: string[]): Promise<void>;
  recountStory(storyId: string): Promise<void>;

  /* Notes */
  listNotes(): Promise<Note[]>;
  createNote(input: Partial<Note> & { body: string }): Promise<Note>;
  updateNote(id: string, patch: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  /* Media */
  listMedia(): Promise<MediaSource[]>;
  createMedia(input: Partial<MediaSource> & { file_name: string }): Promise<MediaSource>;
  updateMedia(id: string, patch: Partial<MediaSource>): Promise<MediaSource>;
  deleteMedia(id: string): Promise<void>;
  uploadMedia(file: File, kind: "audio" | "video" | "cover"): Promise<UploadResult>;
  getMediaUrl(item: Pick<MediaSource, "storage_path" | "source_url">): Promise<string | null>;
  deleteMediaFile(path: string): Promise<void>;

  /* Versions */
  listVersions(storyId: string): Promise<StoryVersion[]>;
  createVersion(input: Omit<StoryVersion, "id" | "created_at">): Promise<StoryVersion>;
  deleteVersion(id: string): Promise<void>;

  /* AI history */
  listAiHistory(limit?: number): Promise<AiHistoryEntry[]>;
  createAiHistory(
    input: Omit<AiHistoryEntry, "id" | "owner_id" | "created_at">
  ): Promise<AiHistoryEntry>;

  /* Reading progress */
  getProgress(storyId: string): Promise<ReadingProgress | null>;
  saveProgress(storyId: string, chapterId: string | null, percent: number): Promise<void>;

  /* Backup */
  exportAll(): Promise<BackupPayload>;
  importAll(payload: BackupPayload): Promise<void>;
}
