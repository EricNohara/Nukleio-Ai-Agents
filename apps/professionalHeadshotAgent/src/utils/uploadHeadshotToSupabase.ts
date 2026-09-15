import getSupabaseClient from "./getSupabaseClient";
import isAccountActive from "./isAccountActive";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeFileName(prefix: string, extension: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
}

export async function uploadHeadshotToSupabase(
  imageBuffer: Buffer,
  options: {
    userId: string;
    contentType?: string;
  },
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const bucket =
    process.env.SUPABASE_HEADSHOT_BUCKET ?? "professional_headshots";

  const userId = options.userId;
  if (!UUID_PATTERN.test(userId)) {
    throw new Error("Invalid user ID for headshot upload");
  }

  const contentType = options.contentType ?? "image/jpeg";

  const fileName = makeFileName("headshot", "jpg");
  const objectPath = `generated/${userId}/${fileName}`;

  if (!await isAccountActive(userId)) {
    throw new Error("Account is not available for headshot upload");
  }

  const reservation = await supabase.rpc("reserve_storage_upload", {
    p_user_id: userId,
    p_bucket: bucket,
    p_object_path: objectPath,
    p_category: "ai_cache",
    p_byte_size: imageBuffer.length,
    p_is_premium: true,
  });
  if (reservation.error || !reservation.data) {
    throw new Error(reservation.error?.message ?? "Unable to reserve headshot storage");
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, imageBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    await supabase.from("storage_quota_ledger").delete().eq("id", reservation.data);
    console.error("Supabase upload error:", error);
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
      throw new Error("Account is not available for headshot upload");
    }
  } catch (accountStatusError) {
    const { error: cleanupError } = await supabase.storage
      .from(bucket)
      .remove([objectPath]);

    if (cleanupError) {
      console.error("Unable to roll back headshot upload:", cleanupError);
    }
    await supabase.from("storage_quota_ledger").delete().eq("id", reservation.data);
    throw accountStatusError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return data?.publicUrl ?? null;
}
