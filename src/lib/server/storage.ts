import "server-only";

import { createServerSupabase } from "../supabase/server";

export const MEDIA_BUCKET = "media";

/**
 * Pulls a private object from Supabase Storage using the owner's session.
 * Storage RLS guarantees the path belongs to the signed-in owner, so no
 * service-role key is needed anywhere in the app.
 */
export async function downloadMediaObject(path: string): Promise<File> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(path);

  if (error || !data) {
    throw new Error(
      "Berkas tidak ditemukan di penyimpanan. Unggah ulang, atau periksa kebijakan bucket media."
    );
  }

  const name = path.split("/").pop() ?? "media";
  return new File([data], name, { type: data.type || "application/octet-stream" });
}
