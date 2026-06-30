import { eq, and, desc, sql, gte } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertJob } from "@db/schema";
import { getDb } from "./connection";

export async function findAllJobs(filters?: {
  status?: string;
  companyId?: number;
  remoteStatus?: string;
  search?: string;
  minMatchScore?: number;
  sourceType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const conditions = [];

  if (filters?.status) {
    conditions.push(
      eq(
        schema.jobs.status,
        filters.status as
          | "new"
          | "matched"
          | "reviewing"
          | "applied"
          | "interview"
          | "rejected"
          | "ghosted"
          | "saved"
      )
    );
  }
  if (filters?.companyId) {
    conditions.push(eq(schema.jobs.companyId, filters.companyId));
  }
  if (filters?.remoteStatus) {
    conditions.push(
      eq(
        schema.jobs.remoteStatus,
        filters.remoteStatus as "remote" | "hybrid" | "onsite" | "unknown"
      )
    );
  }
  if (filters?.search) {
    conditions.push(
      sql`${schema.jobs.title} LIKE ${`%${filters.search}%`} OR ${schema.jobs.description} LIKE ${`%${filters.search}%`}`
    );
  }
  if (filters?.minMatchScore) {
    conditions.push(gte(schema.jobs.matchScore, String(filters.minMatchScore)));
  }
  if (filters?.sourceType) {
    conditions.push(
      eq(
        schema.jobs.sourceType,
        filters.sourceType as
          | "greenhouse"
          | "lever"
          | "workday"
          | "indeed"
          | "linkedin"
          | "rss"
          | "manual"
      )
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(schema.jobs)
          .where(and(...conditions))
          .orderBy(desc(schema.jobs.dateDiscovered))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(schema.jobs)
          .orderBy(desc(schema.jobs.dateDiscovered))
          .limit(limit)
          .offset(offset);

  return query;
}

export async function findJobById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findJobByExternalId(externalId: string, companyId?: number) {
  const conditions = [eq(schema.jobs.externalId, externalId)];
  if (companyId) {
    conditions.push(eq(schema.jobs.companyId, companyId));
  }
  const rows = await getDb()
    .select()
    .from(schema.jobs)
    .where(and(...conditions))
    .limit(1);
  return rows.at(0);
}

export async function createJob(data: InsertJob) {
  const result = await getDb().insert(schema.jobs).values(data);
  return result;
}

export async function updateJob(id: number, data: Partial<InsertJob>) {
  await getDb()
    .update(schema.jobs)
    .set(data)
    .where(eq(schema.jobs.id, id));
}

export async function deleteJob(id: number) {
  await getDb()
    .delete(schema.jobs)
    .where(eq(schema.jobs.id, id));
}

export async function countJobs(filters?: { status?: string; companyId?: number }) {
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(schema.jobs.status, filters.status as "new" | "matched" | "reviewing" | "applied" | "interview" | "rejected" | "ghosted" | "saved"));
  }
  if (filters?.companyId) {
    conditions.push(eq(schema.jobs.companyId, filters.companyId));
  }

  const query =
    conditions.length > 0
      ? getDb()
          .select({ count: sql<number>`count(*)` })
          .from(schema.jobs)
          .where(and(...conditions))
      : getDb()
          .select({ count: sql<number>`count(*)` })
          .from(schema.jobs);

  const rows = await query;
  return rows[0]?.count ?? 0;
}

export async function getJobsByStatus(status: string) {
  return getDb()
    .select()
    .from(schema.jobs)
    .where(
      eq(
        schema.jobs.status,
        status as "new" | "matched" | "reviewing" | "applied" | "interview" | "rejected" | "ghosted" | "saved"
      )
    )
    .orderBy(desc(schema.jobs.dateDiscovered));
}

export async function getRecentJobs(limit: number = 10) {
  return getDb()
    .select()
    .from(schema.jobs)
    .orderBy(desc(schema.jobs.dateDiscovered))
    .limit(limit);
}

export async function getJobStats() {
  const db = getDb();
  const statusCounts = await db
    .select({
      status: schema.jobs.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.jobs)
    .groupBy(schema.jobs.status);

  const sourceCounts = await db
    .select({
      source: schema.jobs.sourceType,
      count: sql<number>`count(*)`,
    })
    .from(schema.jobs)
    .groupBy(schema.jobs.sourceType);

  const totalJobs = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.jobs);

  return {
    total: totalJobs[0]?.count ?? 0,
    byStatus: statusCounts,
    bySource: sourceCounts,
  };
}

export async function clearAllJobs(sourceType?: string) {
  const db = getDb();
  if (sourceType) {
    await db.delete(schema.jobs).where(eq(schema.jobs.sourceType, sourceType as any));
  } else {
    await db.delete(schema.jobs);
  }
}

export async function exportAllJobs() {
  return getDb().select().from(schema.jobs).orderBy(desc(schema.jobs.dateDiscovered));
}
