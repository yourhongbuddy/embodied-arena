import type { D1Binding } from "../../db/d1.ts";
import { PROFILE_PRIVACY_VERSION, type ContactProfile } from "./profile-contract.ts";

type ProfileRow = { phone: string | null; created_at: string; updated_at: string };
export const READ_PROFILE_SQL = "SELECT phone, created_at, updated_at FROM account_profiles WHERE user_id = ?";
export const SAVE_PROFILE_SQL = `INSERT INTO account_profiles (user_id, email, phone, privacy_version)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, phone = excluded.phone,
    privacy_version = excluded.privacy_version, consent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  WHERE account_profiles.updated_at <= datetime('now', '-2 seconds')`;
export const DELETE_PROFILE_SQL = "DELETE FROM account_profiles WHERE user_id = ?";

export async function readProfile(db: D1Binding, userId: string): Promise<ContactProfile | null> {
  const row = await db.prepare(READ_PROFILE_SQL).bind(userId).first<ProfileRow>();
  return row ? { phone: row.phone, createdAt: row.created_at, updatedAt: row.updated_at } : null;
}

export async function saveProfile(db: D1Binding, user: { userId: string; email: string }, phone: string | null) {
  const result = await db.prepare(SAVE_PROFILE_SQL).bind(user.userId, user.email, phone, PROFILE_PRIVACY_VERSION).run() as { meta?: { changes?: number } };
  if (!Number.isInteger(result.meta?.changes)) throw new Error("Profile write was not acknowledged.");
  return result.meta!.changes! > 0;
}

export async function deleteProfile(db: D1Binding, userId: string) {
  await db.prepare(DELETE_PROFILE_SQL).bind(userId).run();
}
