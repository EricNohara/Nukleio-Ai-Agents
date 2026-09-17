import getSupabaseClient from "./getSupabaseClient";

export default async function isAccountActive(userId: string) {
  const supabase = getSupabaseClient();
  const [authResult, lockResult] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase
      .from("account_deletion_locks")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (authResult.error && authResult.error.status !== 404) {
    throw new Error(`Unable to verify Auth user: ${authResult.error.message}`);
  }

  if (lockResult.error) {
    throw new Error(
      `Unable to check account deletion status: ${lockResult.error.message}`,
    );
  }

  return Boolean(authResult.data.user) && !lockResult.data;
}
