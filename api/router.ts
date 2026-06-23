import { authRouter } from "./auth-router";
import { localAuthRouter } from "./local-auth-router";
import { companiesRouter } from "./companies-router";
import { jobsRouter } from "./jobs-router";
import { resumeRouter } from "./resume-router";
import { applicationsRouter } from "./applications-router";
import { preferencesRouter } from "./preferences-router";
import { scrapingRouter } from "./scraping-router";
import { notificationsRouter } from "./notifications-router";
import { aiRouter } from "./ai-router";
import { dashboardRouter } from "./dashboard-router";
import { storageRouter } from "./storage-router";
import { suggestionsRouter } from "./suggestions-router";
import { emailRouter } from "./email-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  auth: authRouter,
  localAuth: localAuthRouter,

  companies: companiesRouter,
  jobs: jobsRouter,
  resume: resumeRouter,
  applications: applicationsRouter,
  preferences: preferencesRouter,
  scraping: scrapingRouter,
  notifications: notificationsRouter,
  ai: aiRouter,
  dashboard: dashboardRouter,
  storage: storageRouter,
  suggestions: suggestionsRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;
