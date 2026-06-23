import { eq, and } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUserPreferences } from "@db/schema";
import { getDb } from "./connection";

export async function findPreferencesByUserId(userId: string, userType: string = "oauth") {
  const rows = await getDb()
    .select()
    .from(schema.userPreferences)
    .where(
      and(
        eq(schema.userPreferences.userId, userId),
        eq(schema.userPreferences.userType, userType as "oauth" | "local")
      )
    )
    .limit(1);
  return rows.at(0);
}

export async function findPreferencesById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.id, id))
    .limit(1);
  return rows.at(0);
}

export async function createPreferences(data: InsertUserPreferences) {
  const result = await getDb().insert(schema.userPreferences).values(data);
  return result;
}

export async function updatePreferences(
  userId: string,
  userType: string,
  data: Partial<InsertUserPreferences>
) {
  await getDb()
    .update(schema.userPreferences)
    .set(data)
    .where(
      and(
        eq(schema.userPreferences.userId, userId),
        eq(schema.userPreferences.userType, userType as "oauth" | "local")
      )
    );
}

export async function upsertPreferences(
  userId: string,
  userType: string,
  data: Partial<InsertUserPreferences>
) {
  const existing = await findPreferencesByUserId(userId, userType);
  if (existing) {
    await updatePreferences(userId, userType, data);
    return findPreferencesByUserId(userId, userType);
  } else {
    await createPreferences({
      userId,
      userType: userType as "oauth" | "local",
      ...data,
    } as InsertUserPreferences);
    return findPreferencesByUserId(userId, userType);
  }
}

export async function deletePreferences(id: number) {
  await getDb()
    .delete(schema.userPreferences)
    .where(eq(schema.userPreferences.id, id));
}
