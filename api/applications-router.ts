import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import {
  findAllApplications,
  findApplicationById,
  findApplicationByJobId,
  createApplication,
  updateApplication,
  deleteApplication,
  getApplicationStats,
  getRecentApplications,
} from "./queries/applications";

export const applicationsRouter = createRouter({
  list: authedQuery
    .input(
      z
        .object({
          jobId: z.number().optional(),
          responseStatus: z.string().optional(),
          applicationMethod: z.string().optional(),
          limit: z.number().min(1).max(200).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return findAllApplications(input ?? {});
    }),

  byId: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const app = await findApplicationById(input.id);
      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }
      return app;
    }),

  byJobId: authedQuery
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      return findApplicationByJobId(input.jobId);
    }),

  create: authedQuery
    .input(
      z.object({
        jobId: z.number(),
        resumeVersionId: z.number().optional(),
        coverLetterId: z.number().optional(),
        applicationMethod: z
          .enum(["full_auto", "semi_auto", "manual"])
          .optional(),
        notes: z.string().optional(),
        submittedAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createApplication({
        ...input,
        applicationMethod: input.applicationMethod ?? "manual",
        submittedAt: input.submittedAt ? new Date(input.submittedAt) : undefined,
      });
      return { success: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          resumeVersionId: z.number().optional().nullable(),
          coverLetterId: z.number().optional().nullable(),
          applicationMethod: z
            .enum(["full_auto", "semi_auto", "manual"])
            .optional(),
          confirmationText: z.string().optional().nullable(),
          followUpDate: z.string().optional().nullable(),
          responseStatus: z
            .enum([
              "pending",
              "phone_screen",
              "interview",
              "offer",
              "rejection",
              "withdrawn",
            ])
            .optional(),
          notes: z.string().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if (input.data.followUpDate !== undefined) {
        data.followUpDate = input.data.followUpDate
          ? new Date(input.data.followUpDate)
          : null;
      }
      await updateApplication(input.id, data);
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteApplication(input.id);
      return { success: true };
    }),

  recent: authedQuery
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ input }) => {
      return getRecentApplications(input?.limit ?? 10);
    }),

  stats: authedQuery.query(async () => {
    return getApplicationStats();
  }),
});
