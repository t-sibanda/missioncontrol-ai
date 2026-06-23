import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertNotification } from "@db/schema";
import { getDb } from "./connection";

export async function findAllNotifications(
  userId: string,
  userType: string = "oauth",
  filters?: { isRead?: boolean; type?: string; limit?: number; offset?: number }
) {
  const db = getDb();
  const conditions = [
    eq(schema.notifications.userId, userId),
    eq(schema.notifications.userType, userType as "oauth" | "local"),
  ];

  if (filters?.isRead !== undefined) {
    conditions.push(eq(schema.notifications.isRead, filters.isRead));
  }
  if (filters?.type) {
    conditions.push(
      eq(
        schema.notifications.type,
        filters.type as
          | "new_match"
          | "applied"
          | "interview"
          | "follow_up"
          | "system"
          | "error"
      )
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  return db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.sentAt))
    .limit(limit)
    .offset(offset);
}

export async function findNotificationById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.id, id))
    .limit(1);
  return rows.at(0);
}

export async function createNotification(data: InsertNotification) {
  const result = await getDb().insert(schema.notifications).values(data);
  return result;
}

export async function markAsRead(id: number) {
  await getDb()
    .update(schema.notifications)
    .set({ isRead: true })
    .where(eq(schema.notifications.id, id));
}

export async function markAllAsRead(userId: string, userType: string = "oauth") {
  await getDb()
    .update(schema.notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.userType, userType as "oauth" | "local"),
        eq(schema.notifications.isRead, false)
      )
    );
}

export async function deleteNotification(id: number) {
  await getDb()
    .delete(schema.notifications)
    .where(eq(schema.notifications.id, id));
}

export async function getUnreadCount(userId: string, userType: string = "oauth") {
  const rows = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.userType, userType as "oauth" | "local"),
        eq(schema.notifications.isRead, false)
      )
    );
  return rows[0]?.count ?? 0;
}
