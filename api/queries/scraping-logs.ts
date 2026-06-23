import { eq, desc, and, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertScrapingLog } from "@db/schema";
import { getDb } from "./connection";

export async function findAllLogs(filters?: {
  companyId?: number;
  sourceType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const conditions = [];

  if (filters?.companyId) {
    conditions.push(eq(schema.scrapingLogs.companyId, filters.companyId));
  }
  if (filters?.sourceType) {
    conditions.push(
      eq(
        schema.scrapingLogs.sourceType,
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
          .from(schema.scrapingLogs)
          .where(and(...conditions))
          .orderBy(desc(schema.scrapingLogs.startedAt))
          .limit(limit)
          .offset(offset)
      : db
          .select()
          .from(schema.scrapingLogs)
          .orderBy(desc(schema.scrapingLogs.startedAt))
          .limit(limit)
          .offset(offset);

  return query;
}

export async function findLogById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.scrapingLogs)
    .where(eq(schema.scrapingLogs.id, id))
    .limit(1);
  return rows.at(0);
}

export async function createLog(data: InsertScrapingLog) {
  const result = await getDb().insert(schema.scrapingLogs).values(data);
  return result;
}

export async function updateLog(id: number, data: Partial<InsertScrapingLog>) {
  await getDb()
    .update(schema.scrapingLogs)
    .set(data)
    .where(eq(schema.scrapingLogs.id, id));
}

export async function getLogStats() {
  const db = getDb();

  const totalRuns = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.scrapingLogs);

  const totalJobsFound = await db
    .select({
      total: sql<number>`COALESCE(SUM(jobs_found), 0)`,
    })
    .from(schema.scrapingLogs);

  const sourceBreakdown = await db
    .select({
      source: schema.scrapingLogs.sourceType,
      count: sql<number>`count(*)`,
      jobsFound: sql<number>`COALESCE(SUM(jobs_found), 0)`,
    })
    .from(schema.scrapingLogs)
    .groupBy(schema.scrapingLogs.sourceType);

  return {
    totalRuns: totalRuns[0]?.count ?? 0,
    totalJobsFound: totalJobsFound[0]?.total ?? 0,
    bySource: sourceBreakdown,
  };
}
