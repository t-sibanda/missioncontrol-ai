import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import {
  findAllProfiles,
  findProfileById,
  findDefaultProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  setDefaultProfile,
} from "./queries/resume-profiles";
import {
  findVersionsByProfileId,
  findVersionById,
  findVersionsByJobId,
  createVersion,
  updateVersion,
  deleteVersion,
} from "./queries/resume-versions";

export const resumeRouter = createRouter({
  // ─── Profile Management ───────────────────────────────────────
  listProfiles: authedQuery.query(async ({ ctx }) => {
    const userId = ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
    return findAllProfiles(userId, ctx.user.authType);
  }),

  getProfile: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const profile = await findProfileById(input.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }
      return profile;
    }),

  getDefaultProfile: authedQuery.query(async ({ ctx }) => {
    const userId = ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
    return findDefaultProfile(userId, ctx.user.authType);
  }),

  createProfile: authedQuery
    .input(
      z.object({
        baseResumeText: z.string().min(1),
        baseResumeJson: z.record(z.string(), z.unknown()).optional(),
        voiceProfile: z.string().optional(),
        writingSamples: z.array(z.string()).optional(),
        fullName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        linkedInUrl: z.string().url().optional(),
        portfolioUrl: z.string().url().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
      await createProfile({
        ...input,
        userId,
        userType: ctx.user.authType,
      });
      return { success: true };
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          baseResumeText: z.string().optional(),
          baseResumeJson: z.record(z.string(), z.unknown()).optional(),
          voiceProfile: z.string().optional(),
          writingSamples: z.array(z.string()).optional(),
          fullName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          linkedInUrl: z.string().url().optional(),
          portfolioUrl: z.string().url().optional(),
          pdfUrl: z.string().optional(),
          docxUrl: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updateProfile(input.id, input.data);
      return { success: true };
    }),

  deleteProfile: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProfile(input.id);
      return { success: true };
    }),

  setDefaultProfile: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
      await setDefaultProfile(input.id, userId, ctx.user.authType);
      return { success: true };
    }),

  // ─── Version Management ───────────────────────────────────────
  listVersions: authedQuery
    .input(z.object({ profileId: z.number() }))
    .query(async ({ input }) => {
      return findVersionsByProfileId(input.profileId);
    }),

  getVersion: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const version = await findVersionById(input.id);
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      }
      return version;
    }),

  getVersionsByJob: authedQuery
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      return findVersionsByJobId(input.jobId);
    }),

  createVersion: authedQuery
    .input(
      z.object({
        profileId: z.number(),
        targetJobId: z.number().optional(),
        atsScore: z.string().optional(),
        changesMade: z.array(z.record(z.string(), z.unknown())).optional(),
        tailoredResumeText: z.string().optional(),
        tailoredResumeJson: z.record(z.string(), z.unknown()).optional(),
        coverLetter: z.string().optional(),
        pdfUrl: z.string().url().optional(),
        docxUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createVersion({
        ...input,
        status: "draft",
      });
      return { success: true };
    }),

  updateVersion: authedQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          atsScore: z.string().optional(),
          changesMade: z.array(z.record(z.string(), z.unknown())).optional(),
          tailoredResumeText: z.string().optional(),
          tailoredResumeJson: z.record(z.string(), z.unknown()).optional(),
          coverLetter: z.string().optional(),
          pdfUrl: z.string().url().optional(),
          docxUrl: z.string().url().optional(),
          status: z.enum(["draft", "reviewing", "approved", "rejected"]).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updateVersion(input.id, input.data);
      return { success: true };
    }),

  deleteVersion: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteVersion(input.id);
      return { success: true };
    }),
});
