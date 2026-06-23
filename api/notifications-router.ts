import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  findAllNotifications,
  findNotificationById,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "./queries/notifications";

export const notificationsRouter = createRouter({
  list: authedQuery
    .input(
      z
        .object({
          isRead: z.boolean().optional(),
          type: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId =
        ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
      return findAllNotifications(userId, ctx.user.authType, input ?? {});
    }),

  byId: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return findNotificationById(input.id);
    }),

  unreadCount: authedQuery.query(async ({ ctx }) => {
    const userId =
      ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
    return getUnreadCount(userId, ctx.user.authType);
  }),

  create: authedQuery
    .input(
      z.object({
        type: z.enum([
          "new_match",
          "applied",
          "interview",
          "follow_up",
          "system",
          "error",
        ]),
        title: z.string().min(1),
        message: z.string().optional(),
        jobId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId =
        ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
      await createNotification({
        ...input,
        userId,
        userType: ctx.user.authType,
      });
      return { success: true };
    }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markAsRead(input.id);
      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    const userId =
      ctx.user.authType === "oauth" ? ctx.user.unionId! : String(ctx.user.id);
    await markAllAsRead(userId, ctx.user.authType);
    return { success: true };
  }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteNotification(input.id);
      return { success: true };
    }),
});
