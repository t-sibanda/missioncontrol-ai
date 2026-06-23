import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";

/**
 * Email Router
 * Uses Supabase Edge Functions or a simple SMTP fallback.
 * For now, queues emails for processing. When Supabase is connected,
 * these will be sent via Supabase's email service.
 */

// In-memory queue for emails (will be processed by Supabase in production)
const emailQueue: Array<{
  to: string;
  subject: string;
  body: string;
  type: string;
  sentAt: Date;
}> = [];

export const emailRouter = createRouter({
  // Send a custom email
  send: authedQuery
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        type: z.enum([
          "job_alert",
          "application_followup",
          "interview_reminder",
          "offer_notification",
          "custom",
        ]).default("custom"),
      })
    )
    .mutation(async ({ input }) => {
      const email = {
        to: input.to,
        subject: input.subject,
        body: input.body,
        type: input.type,
        sentAt: new Date(),
      };
      emailQueue.push(email);

      // Try to send via Supabase Edge Function if configured
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: input.to,
              subject: input.subject,
              body: input.body,
            }),
          });
          if (!res.ok) {
            console.warn("Supabase email failed, queued for later:", await res.text());
          }
        } catch (err) {
          console.warn("Email service unavailable, queued:", err);
        }
      }

      return { success: true, queued: true, message: "Email queued for delivery" };
    }),

  // Send job alert
  sendJobAlert: authedQuery
    .input(
      z.object({
        to: z.string().email(),
        jobTitle: z.string(),
        companyName: z.string(),
        jobUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const subject = `New job match: ${input.jobTitle} at ${input.companyName}`;
      const body = `
Hi,

We found a new job that matches your preferences:

Position: ${input.jobTitle}
Company: ${input.companyName}
Link: ${input.jobUrl}

Good luck with your application!
— MissionControl AI
      `.trim();

      emailQueue.push({
        to: input.to,
        subject,
        body,
        type: "job_alert",
        sentAt: new Date(),
      });

      return { success: true, queued: true };
    }),

  // Send interview reminder
  sendInterviewReminder: authedQuery
    .input(
      z.object({
        to: z.string().email(),
        companyName: z.string(),
        interviewDate: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const subject = `Interview reminder: ${input.companyName}`;
      const body = `
Hi,

You have an upcoming interview:

Company: ${input.companyName}
Date: ${input.interviewDate}
${input.notes ? `Notes: ${input.notes}` : ""}

You've got this!
— MissionControl AI
      `.trim();

      emailQueue.push({ to: input.to, subject, body, type: "interview_reminder", sentAt: new Date() });
      return { success: true, queued: true };
    }),

  // Get email history
  history: authedQuery.query(async () => {
    return emailQueue.slice(-50).reverse();
  }),

  // Get queue status
  status: authedQuery.query(async () => {
    return {
      queued: emailQueue.length,
      lastSent: emailQueue.length > 0 ? emailQueue[emailQueue.length - 1].sentAt : null,
    };
  }),
});
