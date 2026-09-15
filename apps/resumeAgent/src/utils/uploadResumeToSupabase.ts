import getSupabaseClient from "./getSupabaseClient";
import isAccountActive from "./isAccountActive";

function makeFileName(prefix: string, extension: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
}

export async function uploadResumeToSupabase(
  pdfBuffer: Buffer,
  options: {
    userId: string;
    contentType?: string;
    fileNamePrefix?: string;
  },
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const bucket = process.env.SUPABASE_RESUME_BUCKET ?? "generated_resumes";

  const userId = options.userId;
  const contentType = options.contentType ?? "application/pdf";
  const fileNamePrefix = options.fileNamePrefix ?? "resume";

  const fileName = makeFileName(fileNamePrefix, "pdf");
  const objectPath = `${userId}/${fileName}`;

  if (!await isAccountActive(userId)) {
    throw new Error("Account is not available for resume upload");
  }

  const reservation = await supabase.rpc("reserve_storage_upload", {
    p_user_id: userId,
    p_bucket: bucket,
    p_object_path: objectPath,
    p_category: "ai_cache",
    p_byte_size: pdfBuffer.length,
    p_is_premium: true,
  });
  if (reservation.error || !reservation.data) {
    throw new Error(reservation.error?.message ?? "Unable to reserve resume storage");
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, pdfBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    await supabase.from("storage_quota_ledger").delete().eq("id", reservation.data);
    console.error("Supabase resume upload error:", error);
    return null;
  }

  const finalized = await supabase.rpc("finalize_storage_upload", { p_id: reservation.data });
  if (finalized.error) {
    await supabase.storage.from(bucket).remove([objectPath]);
    await supabase.from("storage_quota_ledger").delete().eq("id", reservation.data);
    throw new Error(finalized.error.message);
  }

  try {
    if (!await isAccountActive(userId)) {
      throw new Error("Account is not available for resume upload");
    }
  } catch (accountStatusError) {
    const { error: cleanupError } = await supabase.storage
      .from(bucket)
      .remove([objectPath]);

    if (cleanupError) {
      console.error("Unable to roll back resume upload:", cleanupError);
    }
    await supabase.from("storage_quota_ledger").delete().eq("id", reservation.data);
    throw accountStatusError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return data?.publicUrl ?? null;
}
