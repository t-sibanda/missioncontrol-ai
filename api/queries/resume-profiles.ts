import { eq, and } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertResumeProfile } from "@db/schema";
import { getDb } from "./connection";

export async function findAllProfiles(userId: string, userType: string = "oauth") {
  return getDb()
    .select()
    .from(schema.resumeProfiles)
    .where(
      and(
        eq(schema.resumeProfiles.userId, userId),
        eq(schema.resumeProfiles.userType, userType as "oauth" | "local")
      )
    )
    .orderBy(schema.resumeProfiles.createdAt);
}

export async function findProfileById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.resumeProfiles)
    .where(eq(schema.resumeProfiles.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findDefaultProfile(userId: string, userType: string = "oauth") {
  const rows = await getDb()
    .select()
    .from(schema.resumeProfiles)
    .where(
      and(
        eq(schema.resumeProfiles.userId, userId),
        eq(schema.resumeProfiles.userType, userType as "oauth" | "local"),
        eq(schema.resumeProfiles.isDefault, true)
      )
    )
    .limit(1);
  return rows.at(0);
}

export async function createProfile(data: InsertResumeProfile) {
  const result = await getDb().insert(schema.resumeProfiles).values(data);
  return result;
}

export async function updateProfile(id: number, data: Partial<InsertResumeProfile>) {
  await getDb()
    .update(schema.resumeProfiles)
    .set(data)
    .where(eq(schema.resumeProfiles.id, id));
}

export async function deleteProfile(id: number) {
  await getDb()
    .delete(schema.resumeProfiles)
    .where(eq(schema.resumeProfiles.id, id));
}

export async function setDefaultProfile(id: number, userId: string, userType: string = "oauth") {
  const db = getDb();
  // Unset all defaults for this user
  await db
    .update(schema.resumeProfiles)
    .set({ isDefault: false })
    .where(
      and(
        eq(schema.resumeProfiles.userId, userId),
        eq(schema.resumeProfiles.userType, userType as "oauth" | "local")
      )
    );
  // Set the new default
  await db
    .update(schema.resumeProfiles)
    .set({ isDefault: true })
    .where(eq(schema.resumeProfiles.id, id));
}
