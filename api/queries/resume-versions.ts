import { eq, desc } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertResumeVersion } from "@db/schema";
import { getDb } from "./connection";

export async function findVersionsByProfileId(profileId: number) {
  return getDb()
    .select()
    .from(schema.resumeVersions)
    .where(eq(schema.resumeVersions.profileId, profileId))
    .orderBy(desc(schema.resumeVersions.createdAt));
}

export async function findVersionById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.resumeVersions)
    .where(eq(schema.resumeVersions.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findVersionsByJobId(jobId: number) {
  return getDb()
    .select()
    .from(schema.resumeVersions)
    .where(eq(schema.resumeVersions.targetJobId, jobId))
    .orderBy(desc(schema.resumeVersions.createdAt));
}

export async function createVersion(data: InsertResumeVersion) {
  const result = await getDb().insert(schema.resumeVersions).values(data);
  return result;
}

export async function updateVersion(id: number, data: Partial<InsertResumeVersion>) {
  await getDb()
    .update(schema.resumeVersions)
    .set(data)
    .where(eq(schema.resumeVersions.id, id));
}

export async function deleteVersion(id: number) {
  await getDb()
    .delete(schema.resumeVersions)
    .where(eq(schema.resumeVersions.id, id));
}
