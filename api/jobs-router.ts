import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  findAllJobs,
  findJobById,
  findJobByExternalId,
  createJob,
  updateJob,
  deleteJob,
  getRecentJobs,
  getJobStats,
  clearAllJobs,
  exportAllJobs,
} from "./queries/jobs";

export const jobsRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          status: z.string().optional(),
          companyId: z.number().optional(),
          remoteStatus: z.string().optional(),
          search: z.string().optional(),
          minMatchScore: z.number().optional(),
          sourceType: z.string().optional(),
          limit: z.number().min(1).max(200).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return findAllJobs(input ?? {});
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const job = await findJobById(input.id);
      if (!job) return null;
      return job;
    }),

  byExternalId: publicQuery
    .input(
      z.object({
        externalId: z.string(),
        companyId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return findJobByExternalId(input.externalId, input.companyId);
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        location: z.string().optional(),
        companyId: z.number().optional(),
        externalId: z.string().optional(),
        remoteStatus: z
          .enum(["remote", "hybrid", "onsite", "unknown"])
          .optional(),
        salaryRange: z.string().optional(),
        parsedSkills: z.array(z.string()).optional(),
        parsedRequirements: z.array(z.record(z.string(), z.unknown())).optional(),
        sourceUrl: z.string().url(),
        sourceType: z
          .enum([
            "greenhouse",
            "lever",
            "workday",
            "indeed",
            "linkedin",
            "rss",
            "manual",
          ])
          .optional(),
        datePosted: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createJob({
        ...input,
        sourceType: input.sourceType ?? "manual",
        remoteStatus: input.remoteStatus ?? "unknown",
        datePosted: input.datePosted ? new Date(input.datePosted) : undefined,
      });
      return { success: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          title: z.string().min(1).max(200).optional(),
          description: z.string().optional().nullable(),
          location: z.string().optional().nullable(),
          companyId: z.number().optional(),
          remoteStatus: z
            .enum(["remote", "hybrid", "onsite", "unknown"])
            .optional(),
          salaryRange: z.string().optional().nullable(),
          parsedSkills: z.array(z.string()).optional(),
          parsedRequirements: z.array(z.record(z.string(), z.unknown())).optional(),
          matchScore: z.string().optional(),
          status: z
            .enum([
              "new",
              "matched",
              "reviewing",
              "applied",
              "interview",
              "rejected",
              "ghosted",
              "saved",
            ])
            .optional(),
          dateApplied: z.date().optional().nullable(),
          resumeVersionId: z.number().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updateJob(input.id, input.data);
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteJob(input.id);
      return { success: true };
    }),

  updateStatus: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "new",
          "matched",
          "reviewing",
          "applied",
          "interview",
          "rejected",
          "ghosted",
          "saved",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const updates: Record<string, unknown> = { status: input.status };
      if (input.status === "applied") {
        updates.dateApplied = new Date();
      }
      await updateJob(input.id, updates);
      return { success: true };
    }),

  recent: publicQuery
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ input }) => {
      return getRecentJobs(input?.limit ?? 10);
    }),

  stats: publicQuery.query(async () => {
    return getJobStats();
  }),

  clearAll: authedQuery
    .input(z.object({ sourceType: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      await clearAllJobs(input?.sourceType);
      return { success: true };
    }),

  export: authedQuery.query(async () => {
    return exportAllJobs();
  }),
});
