import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { sql, desc } from "drizzle-orm";
import * as schema from "@db/schema";

export const dashboardRouter = createRouter({
  stats: authedQuery.query(async () => {
    const db = getDb();

    // Job counts by status
    const jobStatusCounts = await db
      .select({
        status: schema.jobs.status,
        count: sql<number>`count(*)`,
      })
      .from(schema.jobs)
      .groupBy(schema.jobs.status);

    // Total jobs
    const totalJobsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.jobs);

    // Total companies
    const totalCompaniesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.companies);

    // Total applications
    const totalApplicationsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.applications);

    // Applications by status
    const appStatusCounts = await db
      .select({
        status: schema.applications.responseStatus,
        count: sql<number>`count(*)`,
      })
      .from(schema.applications)
      .groupBy(schema.applications.responseStatus);

    // Recent jobs
    const recentJobs = await db
      .select()
      .from(schema.jobs)
      .orderBy(desc(schema.jobs.dateDiscovered))
      .limit(10);

    // Recent applications
    const recentApplications = await db
      .select()
      .from(schema.applications)
      .orderBy(desc(schema.applications.createdAt))
      .limit(10);

    // Jobs by source
    const jobsBySource = await db
      .select({
        source: schema.jobs.sourceType,
        count: sql<number>`count(*)`,
      })
      .from(schema.jobs)
      .groupBy(schema.jobs.sourceType);

    // High match score jobs
    const highMatchJobs = await db
      .select()
      .from(schema.jobs)
      .where(sql`${schema.jobs.matchScore} >= 80`)
      .orderBy(desc(schema.jobs.matchScore))
      .limit(10);

    // Companies by tier
    const companiesByTier = await db
      .select({
        tier: schema.companies.tier,
        count: sql<number>`count(*)`,
      })
      .from(schema.companies)
      .groupBy(schema.companies.tier);

    // Scraping activity (last 7 days)
    const scrapingActivity = await db
      .select({
        date: sql<string>`DATE(${schema.scrapingLogs.startedAt})`,
        jobsFound: sql<number>`COALESCE(SUM(${schema.scrapingLogs.jobsFound}), 0)`,
        runs: sql<number>`count(*)`,
      })
      .from(schema.scrapingLogs)
      .where(
        sql`${schema.scrapingLogs.startedAt} >= NOW() - INTERVAL '7 days'`
      )
      .groupBy(sql`DATE(${schema.scrapingLogs.startedAt})`)
      .orderBy(sql`DATE(${schema.scrapingLogs.startedAt})`);

    // Analytics: Response rate
    const totalApps = totalApplicationsResult[0]?.count ?? 0;
    const respondedApps = appStatusCounts
      .filter(s => s.status !== "pending")
      .reduce((sum, s) => sum + Number(s.count), 0);
    const responseRate = totalApps > 0 ? Math.round((respondedApps / totalApps) * 100) : 0;

    // Analytics: Applications this week
    const appsThisWeekResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.applications)
      .where(sql`${schema.applications.createdAt} >= NOW() - INTERVAL '7 days'`);

    // Analytics: Applications this month
    const appsThisMonthResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.applications)
      .where(sql`${schema.applications.createdAt} >= NOW() - INTERVAL '30 days'`);

    // Analytics: Most active companies (by applications)
    const mostActiveCompanies = await db
      .select({
        companyName: schema.companies.name,
        count: sql<number>`count(*)`,
      })
      .from(schema.applications)
      .innerJoin(schema.jobs, sql`${schema.applications.jobId} = ${schema.jobs.id}`)
      .innerJoin(schema.companies, sql`${schema.jobs.companyId} = ${schema.companies.id}`)
      .groupBy(schema.companies.name)
      .orderBy(sql`count(*) DESC`)
      .limit(5);

    // Analytics: Average days in pipeline stages
    const avgDaysInStage = await db
      .select({
        status: schema.applications.responseStatus,
        avgDays: sql<number>`ROUND(AVG(EXTRACT(EPOCH FROM (${schema.applications.updatedAt} - ${schema.applications.createdAt})) / 86400))`,
      })
      .from(schema.applications)
      .where(sql`${schema.applications.responseStatus} != 'pending'`)
      .groupBy(schema.applications.responseStatus);

    return {
      summary: {
        totalJobs: totalJobsResult[0]?.count ?? 0,
        totalCompanies: totalCompaniesResult[0]?.count ?? 0,
        totalApplications: totalApplicationsResult[0]?.count ?? 0,
      },
      analytics: {
        responseRate,
        appsThisWeek: appsThisWeekResult[0]?.count ?? 0,
        appsThisMonth: appsThisMonthResult[0]?.count ?? 0,
        mostActiveCompanies,
        avgDaysInStage,
      },
      jobStatusCounts,
      appStatusCounts,
      jobsBySource,
      companiesByTier,
      recentJobs,
      recentApplications,
      highMatchJobs,
      scrapingActivity,
    };
  }),
});
