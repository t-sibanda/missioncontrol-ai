import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

// Comprehensive database of companies across many industries
const COMPANY_DATABASE = [
  // ─── AI & Machine Learning ─────────────────────────────────────
  { name: "OpenAI", careerUrl: "https://openai.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Research" },
  { name: "Anthropic", careerUrl: "https://www.anthropic.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Safety" },
  { name: "Google DeepMind", careerUrl: "https://deepmind.google/careers", atsPlatform: "workday" as const, industry: "AI Research" },
  { name: "xAI", careerUrl: "https://x.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI" },
  { name: "Mistral AI", careerUrl: "https://mistral.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI" },
  { name: "Cohere", careerUrl: "https://cohere.com/careers", atsPlatform: "greenhouse" as const, industry: "AI/NLP" },
  { name: "Perplexity", careerUrl: "https://www.perplexity.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI Search" },
  { name: "Runway", careerUrl: "https://runwayml.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Video" },
  { name: "Stability AI", careerUrl: "https://stability.ai/careers", atsPlatform: "greenhouse" as const, industry: "Generative AI" },
  { name: "Hugging Face", careerUrl: "https://huggingface.co/jobs", atsPlatform: "greenhouse" as const, industry: "AI Platform" },
  { name: "Scale AI", careerUrl: "https://scale.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Data" },
  { name: "Anyscale", careerUrl: "https://www.anyscale.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Platform" },
  { name: "Inflection AI", careerUrl: "https://inflection.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI" },
  { name: "Character AI", careerUrl: "https://character.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI" },
  { name: "Midjourney", careerUrl: "https://www.midjourney.com/careers", atsPlatform: "custom" as const, industry: "Generative AI" },
  { name: "Jasper AI", careerUrl: "https://www.jasper.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI Writing" },
  { name: "Adept AI", careerUrl: "https://www.adept.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI" },
  { name: "Weights & Biases", careerUrl: "https://wandb.ai/careers", atsPlatform: "greenhouse" as const, industry: "ML Ops" },

  // ─── GPU & AI Hardware ─────────────────────────────────────────
  { name: "NVIDIA", careerUrl: "https://www.nvidia.com/en-us/about-nvidia/careers", atsPlatform: "workday" as const, industry: "GPU/AI Hardware" },
  { name: "AMD", careerUrl: "https://www.amd.com/en/corporate/careers", atsPlatform: "workday" as const, industry: "Semiconductors" },
  { name: "Intel", careerUrl: "https://www.intel.com/content/www/us/en/jobs/jobs-at-intel.html", atsPlatform: "workday" as const, industry: "Semiconductors" },
  { name: "Groq", careerUrl: "https://groq.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Chips" },
  { name: "Cerebras", careerUrl: "https://cerebras.net/careers", atsPlatform: "greenhouse" as const, industry: "AI Chips" },
  { name: "SambaNova", careerUrl: "https://sambanova.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI Hardware" },
  { name: "Graphcore", careerUrl: "https://www.graphcore.ai/careers", atsPlatform: "greenhouse" as const, industry: "AI Chips" },

  // ─── Cloud & Infrastructure ────────────────────────────────────
  { name: "Amazon Web Services", careerUrl: "https://www.amazon.jobs/en/teams/aws", atsPlatform: "custom" as const, industry: "Cloud" },
  { name: "Microsoft Azure", careerUrl: "https://careers.microsoft.com", atsPlatform: "custom" as const, industry: "Cloud" },
  { name: "Google Cloud", careerUrl: "https://careers.google.com", atsPlatform: "workday" as const, industry: "Cloud" },
  { name: "CoreWeave", careerUrl: "https://coreweave.com/careers", atsPlatform: "greenhouse" as const, industry: "Cloud GPU" },
  { name: "Nebius", careerUrl: "https://nebius.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Cloud" },
  { name: "Lambda", careerUrl: "https://lambdalabs.com/careers", atsPlatform: "greenhouse" as const, industry: "GPU Cloud" },
  { name: "Crusoe", careerUrl: "https://crusoe.ai/careers", atsPlatform: "greenhouse" as const, industry: "Data Center/AI" },
  { name: "Cloudflare", careerUrl: "https://www.cloudflare.com/careers", atsPlatform: "workday" as const, industry: "Infrastructure" },
  { name: "Vercel", careerUrl: "https://vercel.com/careers", atsPlatform: "greenhouse" as const, industry: "Cloud" },
  { name: "DigitalOcean", careerUrl: "https://www.digitalocean.com/careers", atsPlatform: "greenhouse" as const, industry: "Cloud" },
  { name: "Netlify", careerUrl: "https://www.netlify.com/careers", atsPlatform: "greenhouse" as const, industry: "Cloud" },
  { name: "Heroku", careerUrl: "https://www.heroku.com/careers", atsPlatform: "workday" as const, industry: "Cloud" },
  { name: "Fly.io", careerUrl: "https://fly.io/jobs", atsPlatform: "custom" as const, industry: "Cloud" },

  // ─── Big Tech ──────────────────────────────────────────────────
  { name: "Google", careerUrl: "https://careers.google.com", atsPlatform: "workday" as const, industry: "Tech" },
  { name: "Apple", careerUrl: "https://www.apple.com/careers", atsPlatform: "custom" as const, industry: "Tech" },
  { name: "Meta", careerUrl: "https://www.metacareers.com", atsPlatform: "workday" as const, industry: "Tech" },
  { name: "Amazon", careerUrl: "https://www.amazon.jobs", atsPlatform: "custom" as const, industry: "Tech" },
  { name: "Microsoft", careerUrl: "https://careers.microsoft.com", atsPlatform: "custom" as const, industry: "Tech" },
  { name: "Netflix", careerUrl: "https://jobs.netflix.com", atsPlatform: "custom" as const, industry: "Entertainment" },
  { name: "Tesla", careerUrl: "https://www.tesla.com/careers", atsPlatform: "workday" as const, industry: "Automotive/Energy" },
  { name: "SpaceX", careerUrl: "https://www.spacex.com/careers", atsPlatform: "greenhouse" as const, industry: "Aerospace" },
  { name: "Oracle", careerUrl: "https://www.oracle.com/careers", atsPlatform: "workday" as const, industry: "Enterprise Tech" },
  { name: "Salesforce", careerUrl: "https://www.salesforce.com/company/careers", atsPlatform: "workday" as const, industry: "Enterprise Tech" },
  { name: "Adobe", careerUrl: "https://www.adobe.com/careers.html", atsPlatform: "workday" as const, industry: "Software" },
  { name: "IBM", careerUrl: "https://www.ibm.com/careers", atsPlatform: "workday" as const, industry: "Tech" },
  { name: "Uber", careerUrl: "https://www.uber.com/us/en/careers", atsPlatform: "greenhouse" as const, industry: "Tech/Mobility" },
  { name: "Lyft", careerUrl: "https://www.lyft.com/careers", atsPlatform: "greenhouse" as const, industry: "Tech/Mobility" },
  { name: "Airbnb", careerUrl: "https://careers.airbnb.com", atsPlatform: "greenhouse" as const, industry: "Tech/Travel" },
  { name: "Spotify", careerUrl: "https://www.lifeatspotify.com", atsPlatform: "greenhouse" as const, industry: "Music/Tech" },
  { name: "Twitter/X", careerUrl: "https://careers.twitter.com", atsPlatform: "greenhouse" as const, industry: "Social Media" },
  { name: "LinkedIn", careerUrl: "https://careers.linkedin.com", atsPlatform: "workday" as const, industry: "Social/Professional" },
  { name: "Snap", careerUrl: "https://careers.snap.com", atsPlatform: "workday" as const, industry: "Social Media" },
  { name: "Pinterest", careerUrl: "https://www.pinterestcareers.com", atsPlatform: "greenhouse" as const, industry: "Social Media" },
  { name: "Reddit", careerUrl: "https://www.redditinc.com/careers", atsPlatform: "greenhouse" as const, industry: "Social Media" },

  // ─── Fintech & Payments ────────────────────────────────────────
  { name: "Stripe", careerUrl: "https://stripe.com/jobs", atsPlatform: "lever" as const, industry: "Fintech" },
  { name: "Square (Block)", careerUrl: "https://block.xyz/careers", atsPlatform: "greenhouse" as const, industry: "Fintech" },
  { name: "Plaid", careerUrl: "https://plaid.com/careers", atsPlatform: "greenhouse" as const, industry: "Fintech" },
  { name: "Coinbase", careerUrl: "https://www.coinbase.com/careers", atsPlatform: "greenhouse" as const, industry: "Crypto" },
  { name: "Robinhood", careerUrl: "https://careers.robinhood.com", atsPlatform: "greenhouse" as const, industry: "Fintech" },
  { name: "PayPal", careerUrl: "https://careers.paypal.com", atsPlatform: "workday" as const, industry: "Payments" },
  { name: "Wise", careerUrl: "https://www.wise.jobs", atsPlatform: "greenhouse" as const, industry: "Fintech" },
  { name: "Revolut", careerUrl: "https://www.revolut.com/careers", atsPlatform: "greenhouse" as const, industry: "Fintech" },
  { name: "Brex", careerUrl: "https://www.brex.com/careers", atsPlatform: "greenhouse" as const, industry: "Fintech" },
  { name: "Rippling", careerUrl: "https://www.rippling.com/careers", atsPlatform: "greenhouse" as const, industry: "Fintech/HR" },

  // ─── Productivity & SaaS ───────────────────────────────────────
  { name: "Notion", careerUrl: "https://www.notion.so/careers", atsPlatform: "lever" as const, industry: "Productivity" },
  { name: "Figma", careerUrl: "https://www.figma.com/careers", atsPlatform: "lever" as const, industry: "Design" },
  { name: "Canva", careerUrl: "https://www.canva.com/careers", atsPlatform: "greenhouse" as const, industry: "Design" },
  { name: "Slack", careerUrl: "https://slack.com/careers", atsPlatform: "workday" as const, industry: "Communication" },
  { name: "Zoom", careerUrl: "https://careers.zoom.us", atsPlatform: "workday" as const, industry: "Communication" },
  { name: "Atlassian", careerUrl: "https://www.atlassian.com/company/careers", atsPlatform: "workday" as const, industry: "Dev Tools" },
  { name: "GitHub", careerUrl: "https://github.com/about/careers", atsPlatform: "greenhouse" as const, industry: "Dev Tools" },
  { name: "GitLab", careerUrl: "https://about.gitlab.com/jobs", atsPlatform: "greenhouse" as const, industry: "Dev Tools" },
  { name: "JetBrains", careerUrl: "https://www.jetbrains.com/careers", atsPlatform: "custom" as const, industry: "Dev Tools" },
  { name: "Miro", careerUrl: "https://miro.com/careers", atsPlatform: "greenhouse" as const, industry: "Collaboration" },
  { name: "Monday.com", careerUrl: "https://monday.com/careers", atsPlatform: "greenhouse" as const, industry: "Productivity" },
  { name: "Asana", careerUrl: "https://asana.com/jobs", atsPlatform: "greenhouse" as const, industry: "Productivity" },
  { name: "Airtable", careerUrl: "https://airtable.com/careers", atsPlatform: "greenhouse" as const, industry: "Productivity" },

  // ─── Data & Analytics ──────────────────────────────────────────
  { name: "Databricks", careerUrl: "https://www.databricks.com/company/careers", atsPlatform: "workday" as const, industry: "Data/AI" },
  { name: "Snowflake", careerUrl: "https://careers.snowflake.com", atsPlatform: "workday" as const, industry: "Data Cloud" },
  { name: "Palantir", careerUrl: "https://www.palantir.com/careers", atsPlatform: "custom" as const, industry: "Data Analytics" },
  { name: "Datadog", careerUrl: "https://careers.datadoghq.com", atsPlatform: "greenhouse" as const, industry: "Observability" },
  { name: "Splunk", careerUrl: "https://www.splunk.com/en_us/careers.html", atsPlatform: "workday" as const, industry: "Data Analytics" },
  { name: "Elastic", careerUrl: "https://www.elastic.co/careers", atsPlatform: "greenhouse" as const, industry: "Search/Analytics" },
  { name: "MongoDB", careerUrl: "https://www.mongodb.com/careers", atsPlatform: "greenhouse" as const, industry: "Databases" },
  { name: "Supabase", careerUrl: "https://supabase.com/careers", atsPlatform: "greenhouse" as const, industry: "Databases" },
  { name: "PlanetScale", careerUrl: "https://planetscale.com/careers", atsPlatform: "greenhouse" as const, industry: "Databases" },
  { name: "Confluent", careerUrl: "https://www.confluent.io/careers", atsPlatform: "greenhouse" as const, industry: "Data Streaming" },

  // ─── Cybersecurity ─────────────────────────────────────────────
  { name: "CrowdStrike", careerUrl: "https://www.crowdstrike.com/careers", atsPlatform: "workday" as const, industry: "Cybersecurity" },
  { name: "Palo Alto Networks", careerUrl: "https://jobs.paloaltonetworks.com", atsPlatform: "workday" as const, industry: "Cybersecurity" },
  { name: "Okta", careerUrl: "https://www.okta.com/company/careers", atsPlatform: "greenhouse" as const, industry: "Identity/Security" },
  { name: "Snyk", careerUrl: "https://snyk.io/careers", atsPlatform: "greenhouse" as const, industry: "Cybersecurity" },
  { name: "Zscaler", careerUrl: "https://www.zscaler.com/careers", atsPlatform: "workday" as const, industry: "Cybersecurity" },
  { name: "1Password", careerUrl: "https://1password.com/careers", atsPlatform: "greenhouse" as const, industry: "Security" },
  { name: "SentinelOne", careerUrl: "https://www.sentinelone.com/careers", atsPlatform: "greenhouse" as const, industry: "Cybersecurity" },

  // ─── Data Centers & Engineering ────────────────────────────────
  { name: "Equinix", careerUrl: "https://careers.equinix.com", atsPlatform: "workday" as const, industry: "Data Center" },
  { name: "Digital Realty", careerUrl: "https://www.digitalrealty.com/careers", atsPlatform: "workday" as const, industry: "Data Center" },
  { name: "QTS Data Centers", careerUrl: "https://www.qtsdatacenters.com/careers", atsPlatform: "workday" as const, industry: "Data Center" },
  { name: "Vantage Data Centers", careerUrl: "https://vantage-dc.com/careers", atsPlatform: "greenhouse" as const, industry: "Data Center" },
  { name: "Compass Data Centers", careerUrl: "https://compassdatacenters.com/careers", atsPlatform: "greenhouse" as const, industry: "Data Center" },
  { name: "Iron Mountain", careerUrl: "https://www.ironmountain.com/careers", atsPlatform: "workday" as const, industry: "Data Center" },
  { name: "Stack Infrastructure", careerUrl: "https://www.stackinfra.com/careers", atsPlatform: "greenhouse" as const, industry: "Data Center" },
  { name: "EdgeConneX", careerUrl: "https://www.edgeconnex.com/careers", atsPlatform: "greenhouse" as const, industry: "Data Center" },

  // ─── Construction & Engineering ────────────────────────────────
  { name: "Turner Construction", careerUrl: "https://www.turnerconstruction.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "DPR Construction", careerUrl: "https://www.dpr.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "Mortenson", careerUrl: "https://www.mortenson.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "Jacobs", careerUrl: "https://www.jacobs.com/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "AECOM", careerUrl: "https://aecom.com/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "Bechtel", careerUrl: "https://www.bechtel.com/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "Fluor", careerUrl: "https://www.fluor.com/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "Skanska", careerUrl: "https://www.skanska.com/careers", atsPlatform: "workday" as const, industry: "Construction" },
  { name: "Holder Construction", careerUrl: "https://www.holderconstruction.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "Hensel Phelps", careerUrl: "https://www.henselphelps.com/careers", atsPlatform: "custom" as const, industry: "Construction" },
  { name: "Balfour Beatty", careerUrl: "https://www.balfourbeatty.com/careers", atsPlatform: "workday" as const, industry: "Construction" },
  { name: "Kiewit", careerUrl: "https://www.kiewit.com/careers", atsPlatform: "workday" as const, industry: "Construction" },
  { name: "WSP", careerUrl: "https://www.wsp.com/en-us/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "HDR", careerUrl: "https://www.hdrinc.com/careers", atsPlatform: "workday" as const, industry: "Engineering" },
  { name: "Stantec", careerUrl: "https://www.stantec.com/en/careers", atsPlatform: "workday" as const, industry: "Engineering" },

  // ─── Healthcare & Biotech ──────────────────────────────────────
  { name: "Moderna", careerUrl: "https://www.modernatx.com/careers", atsPlatform: "workday" as const, industry: "Biotech" },
  { name: "Pfizer", careerUrl: "https://www.pfizer.com/about/careers", atsPlatform: "workday" as const, industry: "Pharma" },
  { name: "Johnson & Johnson", careerUrl: "https://www.careers.jnj.com", atsPlatform: "workday" as const, industry: "Healthcare" },
  { name: "UnitedHealth Group", careerUrl: "https://careers.unitedhealthgroup.com", atsPlatform: "workday" as const, industry: "Healthcare" },
  { name: "Epic Systems", careerUrl: "https://careers.epic.com", atsPlatform: "custom" as const, industry: "Health IT" },
  { name: "Tempus", careerUrl: "https://www.tempus.com/careers", atsPlatform: "greenhouse" as const, industry: "AI Healthcare" },

  // ─── E-commerce & Retail ───────────────────────────────────────
  { name: "Shopify", careerUrl: "https://www.shopify.com/careers", atsPlatform: "greenhouse" as const, industry: "E-commerce" },
  { name: "Instacart", careerUrl: "https://instacart.careers", atsPlatform: "greenhouse" as const, industry: "E-commerce" },
  { name: "DoorDash", careerUrl: "https://careers.doordash.com", atsPlatform: "greenhouse" as const, industry: "Delivery" },
  { name: "Walmart", careerUrl: "https://careers.walmart.com", atsPlatform: "workday" as const, industry: "Retail" },
  { name: "Target", careerUrl: "https://corporate.target.com/careers", atsPlatform: "workday" as const, industry: "Retail" },

  // ─── Gaming ────────────────────────────────────────────────────
  { name: "Riot Games", careerUrl: "https://www.riotgames.com/en/work-with-us", atsPlatform: "greenhouse" as const, industry: "Gaming" },
  { name: "Epic Games", careerUrl: "https://www.epicgames.com/site/en-US/careers", atsPlatform: "greenhouse" as const, industry: "Gaming" },
  { name: "Roblox", careerUrl: "https://careers.roblox.com", atsPlatform: "greenhouse" as const, industry: "Gaming" },
  { name: "Unity", careerUrl: "https://careers.unity.com", atsPlatform: "greenhouse" as const, industry: "Gaming" },
  { name: "Valve", careerUrl: "https://www.valvesoftware.com/en/jobs", atsPlatform: "custom" as const, industry: "Gaming" },

  // ─── Consulting & Professional Services ────────────────────────
  { name: "McKinsey", careerUrl: "https://www.mckinsey.com/careers", atsPlatform: "workday" as const, industry: "Consulting" },
  { name: "Deloitte", careerUrl: "https://www2.deloitte.com/careers", atsPlatform: "workday" as const, industry: "Consulting" },
  { name: "Accenture", careerUrl: "https://www.accenture.com/us-en/careers", atsPlatform: "workday" as const, industry: "Consulting" },
  { name: "BCG", careerUrl: "https://careers.bcg.com", atsPlatform: "workday" as const, industry: "Consulting" },
  { name: "PwC", careerUrl: "https://www.pwc.com/gx/en/careers.html", atsPlatform: "workday" as const, industry: "Consulting" },

  // ─── Robotics & Autonomous ─────────────────────────────────────
  { name: "Boston Dynamics", careerUrl: "https://bostondynamics.wd1.myworkdayjobs.com", atsPlatform: "workday" as const, industry: "Robotics" },
  { name: "Waymo", careerUrl: "https://waymo.com/careers", atsPlatform: "workday" as const, industry: "Autonomous Vehicles" },
  { name: "Cruise", careerUrl: "https://www.getcruise.com/careers", atsPlatform: "greenhouse" as const, industry: "Autonomous Vehicles" },
  { name: "Zipline", careerUrl: "https://www.flyzipline.com/careers", atsPlatform: "greenhouse" as const, industry: "Drone Delivery" },
  { name: "Joby Aviation", careerUrl: "https://www.jobyaviation.com/careers", atsPlatform: "greenhouse" as const, industry: "Aviation" },

  // ─── Energy & Climate ──────────────────────────────────────────
  { name: "Schneider Electric", careerUrl: "https://www.se.com/careers", atsPlatform: "workday" as const, industry: "Energy" },
  { name: "Siemens", careerUrl: "https://www.siemens.com/careers", atsPlatform: "workday" as const, industry: "Industrial/Energy" },
  { name: "Eaton", careerUrl: "https://www.eaton.com/careers", atsPlatform: "workday" as const, industry: "Energy" },
  { name: "ABB", careerUrl: "https://careers.abb", atsPlatform: "workday" as const, industry: "Industrial/Energy" },
  { name: "Rivian", careerUrl: "https://rivian.com/careers", atsPlatform: "greenhouse" as const, industry: "EV/Automotive" },
  { name: "Lucid Motors", careerUrl: "https://www.lucidmotors.com/careers", atsPlatform: "greenhouse" as const, industry: "EV/Automotive" },
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
          c.industry.toLowerCase().includes(q) ||
          c.atsPlatform.toLowerCase().includes(q)
      ).slice(0, input.limit ?? 10);
      return results;
    }),

  getAllCompanies: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
    .query(async ({ input }) => {
      return COMPANY_DATABASE.slice(0, input?.limit ?? 200);
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
