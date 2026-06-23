import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

// Curated database of AI/tech/mission-critical companies with career page info
const COMPANY_DATABASE = [
  { name: "OpenAI", careerUrl: "https://openai.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Research" },
  { name: "Anthropic", careerUrl: "https://www.anthropic.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Safety" },
  { name: "NVIDIA", careerUrl: "https://www.nvidia.com/en-us/about-nvidia/careers", atsPlatform: "lever" as const, industry: "GPU/AI Hardware" },
  { name: "Google", careerUrl: "https://careers.google.com", atsPlatform: "workday" as const, industry: "Tech" },
  { name: "CoreWeave", careerUrl: "https://coreweave.com/careers", atsPlatform: "greenhouse" as const, industry: "Cloud GPU" },
  { name: "Nebius", careerUrl: "https://nebius.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Cloud" },
  { name: "Crusoe", careerUrl: "https://crusoe.ai/careers", atsPlatform: "greenhouse" as const, industry: "Data Center/AI" },
  { name: "Scale AI", careerUrl: "https://scale.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Data" },
  { name: "Runway", careerUrl: "https://runwayml.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Video" },
  { name: "Cohere", careerUrl: "https://cohere.com/careers", atsPlatform: "greenhouse" as const, industry: "AI/NLP" },
  { name: "Perplexity", careerUrl: "https://www.perplexity.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI Search" },
  { name: "Anyscale", careerUrl: "https://www.anyscale.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Platform" },
  { name: "Lambda", careerUrl: "https://lambdalabs.com/careers", atsPlatform: "greenhouse" as const, industry: "GPU Cloud" },
  { name: "Equinix", careerUrl: "https://careers.equinix.com", atsPlatform: "workday" as const, industry: "Data Center" },
  { name: "Digital Realty", careerUrl: "https://www.digitalrealty.com/careers", atsPlatform: "workday" as const, industry: "Data Center" },
  { name: "Turner Construction", careerUrl: "https://www.turnerconstruction.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "DPR Construction", careerUrl: "https://www.dpr.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "Mortenson", careerUrl: "https://www.mortenson.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "Jacobs", careerUrl: "https://www.jacobs.com/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "AECOM", careerUrl: "https://aecom.com/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "Meta", careerUrl: "https://www.metacareers.com", atsPlatform: "workday" as const, industry: "Tech" },
  { name: "Microsoft", careerUrl: "https://careers.microsoft.com", atsPlatform: "custom" as const, industry: "Tech" },
  { name: "Amazon", careerUrl: "https://www.amazon.jobs", atsPlatform: "custom" as const, industry: "Tech" },
  { name: "Stripe", careerUrl: "https://stripe.com/jobs", atsPlatform: "lever" as const, industry: "Fintech" },
  { name: "Notion", careerUrl: "https://www.notion.so/careers", atsPlatform: "lever" as const, industry: "Productivity" },
  { name: "Figma", careerUrl: "https://www.figma.com/careers", atsPlatform: "lever" as const, industry: "Design" },
  { name: "xAI", careerUrl: "https://x.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI" },
  { name: "Mistral AI", careerUrl: "https://mistral.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI" },
  { name: "Groq", careerUrl: "https://groq.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Chips" },
  { name: "Hugging Face", careerUrl: "https://huggingface.co/jobs", atsPlatform: "greenhouse" as const, industry: "AI Platform" },
  { name: "Databricks", careerUrl: "https://www.databricks.com/company/careers", atsPlatform: "workday" as const, industry: "Data/AI" },
  { name: "Snowflake", careerUrl: "https://careers.snowflake.com", atsPlatform: "workday" as const, industry: "Data Cloud" },
  { name: "Cloudflare", careerUrl: "https://www.cloudflare.com/careers", atsPlatform: "workday" as const, industry: "Infrastructure" },
  { name: "Vercel", careerUrl: "https://vercel.com/careers", atsPlatform: "greenhouse" as const, industry: "Cloud" },
];

export const suggestionsRouter = createRouter({
  searchCompanies: publicQuery
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).optional(),
      })
    )
    .query(async ({ input }) => {
      const q = input.query.toLowerCase();
      const results = COMPANY_DATABASE.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
      ).slice(0, input.limit ?? 10);
      return results;
    }),

  getAllCompanies: publicQuery
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(async ({ input }) => {
      return COMPANY_DATABASE.slice(0, input?.limit ?? 100);
    }),

  getByIndustry: publicQuery
    .input(
      z.object({
        industries: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.industries || input.industries.length === 0) {
        return COMPANY_DATABASE;
      }
      return COMPANY_DATABASE.filter((c) =>
        input.industries!.some((ind) =>
          c.industry.toLowerCase().includes(ind.toLowerCase())
        )
      );
    }),
});
