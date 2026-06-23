import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  findAllLogs,
  findLogById,
  createLog,
  getLogStats,
} from "./queries/scraping-logs";
import {
  createCompany,
  findCompanyByName,
  updateCompanyLastScraped,
} from "./queries/companies";
import { createJob, findJobByExternalId } from "./queries/jobs";

// Type definitions for API responses
type GreenhouseJob = {
  id: number | string;
  title: string;
  location?: { name?: string };
  absolute_url?: string;
};

type LeverJob = {
  id?: string;
  text?: string;
  categories?: { location?: string | string[] };
  description?: string;
  applyUrl?: string;
  hostedUrl?: string;
};

// Greenhouse API scraper (free, no auth)
async function scrapeGreenhouseBoard(company: string) {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return { jobs: [], error: `HTTP ${response.status}` };
    }
    const data = (await response.json()) as { jobs?: GreenhouseJob[] };
    const jobs = (data.jobs || []).map((job) => ({
      externalId: String(job.id),
      title: String(job.title || ""),
      location: String(job.location?.name || ""),
      description: "",
      sourceUrl: String(job.absolute_url || ""),
      sourceType: "greenhouse" as const,
      parsedSkills: [] as string[],
      parsedRequirements: [] as Record<string, unknown>[],
      status: "new" as const,
    }));
    return { jobs, error: null };
  } catch (error) {
    return {
      jobs: [] as Array<{
        externalId: string;
        title: string;
        location: string;
        description: string;
        sourceUrl: string;
        sourceType: "greenhouse";
        parsedSkills: string[];
        parsedRequirements: Record<string, unknown>[];
        status: "new";
      }>,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lever API scraper (free, no auth)
async function scrapeLeverBoard(company: string) {
  try {
    const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return { jobs: [], error: `HTTP ${response.status}` };
    }
    const data = (await response.json()) as LeverJob[];
    const jobs = (Array.isArray(data) ? data : []).map((job) => {
      const loc = job.categories?.location;
      return {
        externalId: String(job.id || ""),
        title: String(job.text || ""),
        location: Array.isArray(loc) ? loc.join(", ") : String(loc || ""),
        description: String(job.description || ""),
        sourceUrl: String(job.applyUrl || job.hostedUrl || ""),
        sourceType: "lever" as const,
        parsedSkills: [] as string[],
        parsedRequirements: [] as Record<string, unknown>[],
        status: "new" as const,
      };
    });
    return { jobs, error: null };
  } catch (error) {
    return {
      jobs: [] as Array<{
        externalId: string;
        title: string;
        location: string;
        description: string;
        sourceUrl: string;
        sourceType: "lever";
        parsedSkills: string[];
        parsedRequirements: Record<string, unknown>[];
        status: "new";
      }>,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Indeed RSS scraper
async function scrapeIndeedRss(query: string, location?: string) {
  try {
    const params = new URLSearchParams();
    params.append("q", query);
    if (location) params.append("l", location);
    const url = `https://www.indeed.com/rss?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { jobs: [], error: `HTTP ${response.status}` };
    }
    const xml = await response.text();

    // Parse RSS XML
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const jobs = items.map((item) => {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const descMatch = item.match(/<description>(.*?)<\/description>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      return {
        externalId: linkMatch ? String(linkMatch[1]).split("?").pop() || "" : "",
        title: titleMatch ? String(titleMatch[1]).replace(/<!\[CDATA\[(.*?)\]\]>/, "$1") : "",
        location: "",
        description: descMatch
          ? String(descMatch[1]).replace(/<!\[CDATA\[(.*?)\]\]>/, "$1")
          : "",
        sourceUrl: linkMatch ? String(linkMatch[1]) : "",
        sourceType: "indeed" as const,
        datePosted: dateMatch ? new Date(dateMatch[1]) : undefined,
        parsedSkills: [] as string[],
        parsedRequirements: [] as Record<string, unknown>[],
        status: "new" as const,
      };
    });
    return { jobs, error: null };
  } catch (error) {
    return {
      jobs: [] as Array<{
        externalId: string;
        title: string;
        location: string;
        description: string;
        sourceUrl: string;
        sourceType: "indeed";
        datePosted?: Date;
        parsedSkills: string[];
        parsedRequirements: Record<string, unknown>[];
        status: "new";
      }>,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const scrapingRouter = createRouter({
  // Run a scraping job
  run: authedQuery
    .input(
      z.object({
        source: z.enum(["greenhouse", "lever", "indeed", "workday", "rss"]),
        company: z.string().optional(),
        query: z.string().optional(),
        location: z.string().optional(),
        companyId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      let jobs: Array<{
        externalId: string;
        title: string;
        location: string;
        description: string;
        sourceUrl: string;
        sourceType: "greenhouse" | "lever" | "indeed" | "workday" | "rss" | "manual" | "linkedin";
        datePosted?: Date;
        parsedSkills: string[];
        parsedRequirements: Record<string, unknown>[];
        status: "new";
      }> = [];
      let error: string | null = null;

      try {
        switch (input.source) {
          case "greenhouse":
            if (input.company) {
              const result = await scrapeGreenhouseBoard(input.company);
              jobs = result.jobs;
              error = result.error;
            }
            break;
          case "lever":
            if (input.company) {
              const result = await scrapeLeverBoard(input.company);
              jobs = result.jobs;
              error = result.error;
            }
            break;
          case "indeed":
            if (input.query) {
              const result = await scrapeIndeedRss(input.query, input.location);
              jobs = result.jobs;
              error = result.error;
            }
            break;
          default:
            return {
              success: false,
              jobsFound: 0,
              jobsAdded: 0,
              error: "Source not yet implemented",
              duration: Date.now() - startTime,
            };
        }
      } catch (err) {
        error = err instanceof Error ? err.message : "Unknown error";
      }

      // Store jobs in database
      let jobsAdded = 0;
      let jobsUpdated = 0;

      if (jobs.length > 0) {
        // Ensure company exists
        let companyId = input.companyId;
        if (!companyId && input.company) {
          const existingCompany = await findCompanyByName(input.company);
          if (existingCompany) {
            companyId = existingCompany.id;
          } else {
            await createCompany({
              name: input.company.charAt(0).toUpperCase() + input.company.slice(1),
              atsPlatform: input.source as "greenhouse" | "lever" | "workday" | "custom" | "indeed" | "linkedin",
              isActive: true,
            });
            const newCompany = await findCompanyByName(input.company);
            companyId = newCompany?.id;
          }
        }

        for (const job of jobs) {
          try {
            const existing = await findJobByExternalId(
              job.externalId,
              companyId
            );
            if (!existing) {
              await createJob({
                externalId: job.externalId,
                title: job.title,
                location: job.location,
                description: job.description,
                sourceUrl: job.sourceUrl,
                sourceType: job.sourceType,
                companyId: companyId ?? undefined,
                datePosted: job.datePosted,
                parsedSkills: job.parsedSkills,
                parsedRequirements: job.parsedRequirements,
                status: job.status,
              });
              jobsAdded++;
            } else {
              jobsUpdated++;
            }
          } catch {
            // Skip duplicates or errors
          }
        }

        // Update company last scraped
        if (companyId) {
          await updateCompanyLastScraped(companyId);
        }
      }

      // Log the scrape
      await createLog({
        companyId: input.companyId,
        sourceType: input.source as "greenhouse" | "lever" | "workday" | "indeed" | "linkedin" | "rss" | "manual",
        jobsFound: jobs.length,
        jobsAdded,
        jobsUpdated,
        errors: error,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });

      return {
        success: true,
        jobsFound: jobs.length,
        jobsAdded,
        jobsUpdated,
        error,
        duration: Date.now() - startTime,
      };
    }),

  // Get scraping logs
  logs: authedQuery
    .input(
      z
        .object({
          companyId: z.number().optional(),
          sourceType: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return findAllLogs(input ?? {});
    }),

  logById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return findLogById(input.id);
    }),

  stats: authedQuery.query(async () => {
    return getLogStats();
  }),

  // Quick scrape for target companies (bulk)
  bulkScrape: authedQuery
    .input(
      z.object({
        targets: z.array(
          z.object({
            company: z.string(),
            source: z.enum(["greenhouse", "lever"]),
            companyId: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const target of input.targets) {
        const startTime = Date.now();
        let jobs: Array<{
          externalId: string;
          title: string;
          location: string;
          description: string;
          sourceUrl: string;
          sourceType: "greenhouse" | "lever";
          parsedSkills: string[];
          parsedRequirements: Record<string, unknown>[];
          status: "new";
        }> = [];
        let error: string | null = null;

        try {
          if (target.source === "greenhouse") {
            const result = await scrapeGreenhouseBoard(target.company);
            jobs = result.jobs;
            error = result.error;
          } else if (target.source === "lever") {
            const result = await scrapeLeverBoard(target.company);
            jobs = result.jobs;
            error = result.error;
          }

          let companyId = target.companyId;
          if (!companyId) {
            const existing = await findCompanyByName(target.company);
            if (existing) {
              companyId = existing.id;
            } else {
              await createCompany({
                name:
                  target.company.charAt(0).toUpperCase() +
                  target.company.slice(1),
                atsPlatform: target.source,
                isActive: true,
              });
              const newCompany = await findCompanyByName(target.company);
              companyId = newCompany?.id;
            }
          }

          let jobsAdded = 0;
          for (const job of jobs) {
            try {
              const existing = await findJobByExternalId(
                job.externalId,
                companyId
              );
              if (!existing) {
                await createJob({
                  externalId: job.externalId,
                  title: job.title,
                  location: job.location,
                  description: job.description,
                  sourceUrl: job.sourceUrl,
                  sourceType: job.sourceType,
                  companyId: companyId ?? undefined,
                  parsedSkills: job.parsedSkills,
                  parsedRequirements: job.parsedRequirements,
                  status: job.status,
                });
                jobsAdded++;
              }
            } catch {
              // Skip
            }
          }

          if (companyId) {
            await updateCompanyLastScraped(companyId);
          }

          await createLog({
            companyId,
            sourceType: target.source,
            jobsFound: jobs.length,
            jobsAdded,
            durationMs: Date.now() - startTime,
            completedAt: new Date(),
          });

          results.push({
            company: target.company,
            source: target.source,
            jobsFound: jobs.length,
            jobsAdded,
            error,
          });
        } catch (err) {
          results.push({
            company: target.company,
            source: target.source,
            jobsFound: 0,
            jobsAdded: 0,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return { results };
    }),
});
