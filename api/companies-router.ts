import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  findAllCompanies,
  findCompanyById,
  findCompanyByName,
  createCompany,
  updateCompany,
  deleteCompany,
  updateCompanyLastScraped,
  countCompanies,
} from "./queries/companies";

export const companiesRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          atsPlatform: z.string().optional(),
          tier: z.string().optional(),
          isActive: z.boolean().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return findAllCompanies(input ?? {});
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const company = await findCompanyById(input.id);
      if (!company) {
        return null;
      }
      return company;
    }),

  byName: publicQuery
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return findCompanyByName(input.name);
    }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(200),
        careerPageUrl: z.string().url().optional(),
        atsPlatform: z
          .enum(["greenhouse", "lever", "workday", "custom", "indeed", "linkedin"])
          .optional(),
        tier: z.enum(["1", "2", "3"]).optional(),
        rssFeedUrl: z.string().url().optional(),
        apiEndpoint: z.string().url().optional(),
        industry: z.string().optional(),
        website: z.string().url().optional(),
        logo: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createCompany({
        ...input,
        tier: input.tier ?? "3",
        atsPlatform: input.atsPlatform ?? "custom",
      });
      return { success: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).max(200).optional(),
          careerPageUrl: z.string().url().optional().nullable(),
          atsPlatform: z
            .enum(["greenhouse", "lever", "workday", "custom", "indeed", "linkedin"])
            .optional(),
          tier: z.enum(["1", "2", "3"]).optional(),
          rssFeedUrl: z.string().url().optional().nullable(),
          apiEndpoint: z.string().url().optional().nullable(),
          industry: z.string().optional().nullable(),
          website: z.string().url().optional().nullable(),
          logo: z.string().url().optional().nullable(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updateCompany(input.id, input.data);
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCompany(input.id);
      return { success: true };
    }),

  markScraped: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateCompanyLastScraped(input.id);
      return { success: true };
    }),

  stats: publicQuery.query(async () => {
    const total = await countCompanies();
    return { total };
  }),
});
