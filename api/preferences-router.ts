import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  findPreferencesByUserId,
  upsertPreferences,
  deletePreferences,
} from "./queries/preferences";

export const preferencesRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const userId =
      ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
    return findPreferencesByUserId(userId, ctx.user.authType);
  }),

  upsert: authedQuery
    .input(
      z.object({
        desiredTitles: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        salaryMin: z.number().optional(),
        remotePreference: z
          .enum(["remote", "hybrid", "onsite", "any"])
          .optional(),
        keywordsMustHave: z.array(z.string()).optional(),
        keywordsExclude: z.array(z.string()).optional(),
        companiesTier1: z.array(z.string()).optional(),
        companiesTier2: z.array(z.string()).optional(),
        companiesTier3: z.array(z.string()).optional(),
        autoApplyThreshold: z.string().optional(),
        emailForAlerts: z.string().email().optional(),
        alertFrequency: z.enum(["instant", "daily", "weekly"]).optional(),
        enableAutoApply: z.boolean().optional(),
        enableSemiAutoApply: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId =
        ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
      const result = await upsertPreferences(userId, ctx.user.authType, input);
      return result;
    }),

  delete: authedQuery.mutation(async ({ ctx }) => {
    const userId =
      ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
    const prefs = await findPreferencesByUserId(userId, ctx.user.authType);
    if (prefs) {
      await deletePreferences(prefs.id);
    }
    return { success: true };
  }),
});
