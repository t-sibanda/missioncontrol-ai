import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertApplication } from "@db/schema";
import { getDb } from "./connection";

export async function findAllApplications(filters?: {
  jobId?: number;
  responseStatus?: string;
  applicationMethod?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const conditions = [];

  if (filters?.jobId) {
    conditions.push(eq(schema.applications.jobId, filters.jobId));
  }
  if (filters?.responseStatus) {
    conditions.push(
      eq(
        schema.applications.responseStatus,
        filters.responseStatus as
          | "pending"
          | "phone_screen"
          | "interview"
          | "offer"
          | "rejection"
          | "withdrawn"
      )
    );
  }
  if (filters?.applicationMethod) {
    conditions.push(
      eq(
        schema.applications.applicationMethod,
        filters.applicationMethod as "full_auto" | "semi_auto" | "manual"
      )
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(schema.applications)
          .where(and(...conditions))
          .orderBy(desc(schema.applications.createdAt))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(schema.applications)
          .orderBy(desc(schema.applications.createdAt))
          .limit(limit)
          .offset(offset);

  return query;
}

export async function findApplicationById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findApplicationByJobId(jobId: number) {
  const rows = await getDb()
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.jobId, jobId))
    .limit(1);
  return rows.at(0);
}

export async function createApplication(data: InsertApplication) {
  const result = await getDb().insert(schema.applications).values(data);
  return result;
}

export async function updateApplication(id: number, data: Partial<InsertApplication>) {
  await getDb()
    .update(schema.applications)
    .set(data)
    .where(eq(schema.applications.id, id));
}

export async function deleteApplication(id: number) {
  await getDb()
    .delete(schema.applications)
    .where(eq(schema.applications.id, id));
}

export async function getApplicationStats() {
  const db = getDb();

  const statusCounts = await db
    .select({
      status: schema.applications.responseStatus,
      count: sql<number>`count(*)`,
    })
    .from(schema.applications)
    .groupBy(schema.applications.responseStatus);

  const methodCounts = await db
    .select({
      method: schema.applications.applicationMethod,
      count: sql<number>`count(*)`,
    })
    .from(schema.applications)
    .groupBy(schema.applications.applicationMethod);

  const totalApplications = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.applications);

  return {
    total: totalApplications[0]?.count ?? 0,
    byStatus: statusCounts,
    byMethod: methodCounts,
  };
}

export async function getRecentApplications(limit: number = 10) {
  return getDb()
    .select()
    .from(schema.applications)
    .orderBy(desc(schema.applications.createdAt))
    .limit(limit);
}
