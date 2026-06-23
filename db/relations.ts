import { relations } from "drizzle-orm";
import {
  companies,
  jobs,
  resumeProfiles,
  resumeVersions,
  applications,
  notifications,
  scrapingLogs,
} from "./schema";

export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
  scrapingLogs: many(scrapingLogs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  resumeVersions: many(resumeVersions),
  applications: many(applications),
  notifications: many(notifications),
}));

export const resumeProfilesRelations = relations(resumeProfiles, ({ many }) => ({
  versions: many(resumeVersions),
}));

export const resumeVersionsRelations = relations(resumeVersions, ({ one, many }) => ({
  profile: one(resumeProfiles, {
    fields: [resumeVersions.profileId],
    references: [resumeProfiles.id],
  }),
  job: one(jobs, {
    fields: [resumeVersions.targetJobId],
    references: [jobs.id],
  }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  resumeVersion: one(resumeVersions, {
    fields: [applications.resumeVersionId],
    references: [resumeVersions.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  job: one(jobs, {
    fields: [notifications.jobId],
    references: [jobs.id],
  }),
}));

export const scrapingLogsRelations = relations(scrapingLogs, ({ one }) => ({
  company: one(companies, {
    fields: [scrapingLogs.companyId],
    references: [companies.id],
  }),
}));
