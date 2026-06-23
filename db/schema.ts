import {
  pgTable,
  pgEnum,
  varchar,
  text,
  timestamp,
  integer,
  json,
  decimal,
  serial,
  boolean,
  date,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const atsPlatformEnum = pgEnum("ats_platform", [
  "greenhouse", "lever", "workday", "custom", "indeed", "linkedin",
]);
export const tierEnum = pgEnum("tier", ["1", "2", "3"]);
export const remoteStatusEnum = pgEnum("remote_status", [
  "remote", "hybrid", "onsite", "unknown",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "new", "matched", "reviewing", "applied", "interview", "rejected", "ghosted", "saved",
]);
export const sourceTypeEnum = pgEnum("source_type", [
  "greenhouse", "lever", "workday", "indeed", "linkedin", "rss", "manual",
]);
export const userTypeEnum = pgEnum("user_type", ["oauth", "local"]);
export const applicationMethodEnum = pgEnum("application_method", [
  "full_auto", "semi_auto", "manual",
]);
export const responseStatusEnum = pgEnum("response_status", [
  "pending", "phone_screen", "interview", "offer", "rejection", "withdrawn",
]);
export const resumeVersionStatusEnum = pgEnum("resume_version_status", [
  "draft", "reviewing", "approved", "rejected",
]);
export const remotePreferenceEnum = pgEnum("remote_preference", [
  "remote", "hybrid", "onsite", "any",
]);
export const alertFrequencyEnum = pgEnum("alert_frequency", [
  "instant", "daily", "weekly",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "new_match", "applied", "interview", "follow_up", "system", "error",
]);

// ─── Users (OAuth) ───────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Local Users (username/password) ─────────────────────────────
export const localUsers = pgTable("local_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("last_sign_in_at").defaultNow().notNull(),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

// ─── Companies ───────────────────────────────────────────────────
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  careerPageUrl: varchar("career_page_url", { length: 500 }),
  atsPlatform: atsPlatformEnum("ats_platform").default("custom"),
  tier: tierEnum("tier").default("3").notNull(),
  rssFeedUrl: varchar("rss_feed_url", { length: 500 }),
  apiEndpoint: varchar("api_endpoint", { length: 500 }),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 500 }),
  logo: varchar("logo", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastScraped: timestamp("last_scraped"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ─── Jobs ────────────────────────────────────────────────────────
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  externalId: varchar("external_id", { length: 100 }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 200 }),
  remoteStatus: remoteStatusEnum("remote_status").default("unknown"),
  salaryRange: varchar("salary_range", { length: 100 }),
  parsedSkills: json("parsed_skills").$type<string[]>(),
  parsedRequirements: json("parsed_requirements").$type<Record<string, unknown>[]>(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  status: jobStatusEnum("status").default("new"),
  sourceUrl: varchar("source_url", { length: 500 }).notNull(),
  sourceType: sourceTypeEnum("source_type").default("manual"),
  datePosted: date("date_posted"),
  dateDiscovered: timestamp("date_discovered").defaultNow().notNull(),
  dateApplied: timestamp("date_applied"),
  resumeVersionId: integer("resume_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ─── Resume Profiles (base resume + voice) ───────────────────────
export const resumeProfiles = pgTable("resume_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userType: userTypeEnum("user_type").default("oauth").notNull(),
  baseResumeText: text("base_resume_text").notNull(),
  baseResumeJson: json("base_resume_json").$type<Record<string, unknown>>(),
  voiceProfile: text("voice_profile"),
  writingSamples: json("writing_samples").$type<string[]>(),
  fullName: varchar("full_name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  linkedInUrl: varchar("linkedin_url", { length: 500 }),
  portfolioUrl: varchar("portfolio_url", { length: 500 }),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  docxUrl: varchar("docx_url", { length: 500 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type ResumeProfile = typeof resumeProfiles.$inferSelect;
export type InsertResumeProfile = typeof resumeProfiles.$inferInsert;

// ─── Resume Versions (tailored per job) ──────────────────────────
export const resumeVersions = pgTable("resume_versions", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .references(() => resumeProfiles.id)
    .notNull(),
  targetJobId: integer("target_job_id")
    .references(() => jobs.id),
  atsScore: decimal("ats_score", { precision: 5, scale: 2 }),
  changesMade: json("changes_made").$type<Record<string, unknown>[]>(),
  tailoredResumeText: text("tailored_resume_text"),
  tailoredResumeJson: json("tailored_resume_json").$type<Record<string, unknown>>(),
  coverLetter: text("cover_letter"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  docxUrl: varchar("docx_url", { length: 500 }),
  status: resumeVersionStatusEnum("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type ResumeVersion = typeof resumeVersions.$inferSelect;
export type InsertResumeVersion = typeof resumeVersions.$inferInsert;

// ─── Applications ────────────────────────────────────────────────
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .references(() => jobs.id)
    .notNull(),
  resumeVersionId: integer("resume_version_id")
    .references(() => resumeVersions.id),
  coverLetterId: integer("cover_letter_id"),
  applicationMethod: applicationMethodEnum("application_method").default("manual"),
  submittedAt: timestamp("submitted_at"),
  confirmationText: text("confirmation_text"),
  followUpDate: date("follow_up_date"),
  responseStatus: responseStatusEnum("response_status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

// ─── User Preferences ────────────────────────────────────────────
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  userType: userTypeEnum("user_type").default("oauth").notNull(),
  desiredTitles: json("desired_titles").$type<string[]>(),
  locations: json("locations").$type<string[]>(),
  salaryMin: integer("salary_min"),
  remotePreference: remotePreferenceEnum("remote_preference").default("any"),
  keywordsMustHave: json("keywords_must_have").$type<string[]>(),
  keywordsExclude: json("keywords_exclude").$type<string[]>(),
  companiesTier1: json("companies_tier1").$type<string[]>(),
  companiesTier2: json("companies_tier2").$type<string[]>(),
  companiesTier3: json("companies_tier3").$type<string[]>(),
  autoApplyThreshold: decimal("auto_apply_threshold", { precision: 5, scale: 2 }).default(
    "90.00"
  ),
  emailForAlerts: varchar("email_for_alerts", { length: 200 }),
  alertFrequency: alertFrequencyEnum("alert_frequency").default("daily"),
  enableAutoApply: boolean("enable_auto_apply").default(false).notNull(),
  enableSemiAutoApply: boolean("enable_semi_auto_apply").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// ─── Scraping Logs ───────────────────────────────────────────────
export const scrapingLogs = pgTable("scraping_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  sourceType: sourceTypeEnum("source_type").notNull(),
  jobsFound: integer("jobs_found").default(0),
  jobsAdded: integer("jobs_added").default(0),
  jobsUpdated: integer("jobs_updated").default(0),
  errors: text("errors"),
  durationMs: integer("duration_ms"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type ScrapingLog = typeof scrapingLogs.$inferSelect;
export type InsertScrapingLog = typeof scrapingLogs.$inferInsert;

// ─── Notifications ───────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userType: userTypeEnum("user_type").default("oauth").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  jobId: integer("job_id").references(() => jobs.id),
  isRead: boolean("is_read").default(false).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
