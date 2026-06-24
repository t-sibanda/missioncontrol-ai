import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertLocalUser } from "@db/schema";
import { getDb } from "./connection";

export async function findLocalUserByUsername(username: string) {
  const rows = await getDb()
    .select()
    .from(schema.localUsers)
    .where(eq(schema.localUsers.username, username))
    .limit(1);
  return rows.at(0);
}

export async function findLocalUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.localUsers)
    .where(eq(schema.localUsers.id, id))
    .limit(1);
  return rows.at(0);
}

export async function createLocalUser(data: InsertLocalUser) {
  const result = await getDb()
    .insert(schema.localUsers)
    .values(data)
    .returning({ id: schema.localUsers.id });
  return result;
}

export async function updateLocalUserLastSignIn(id: number) {
  await getDb()
    .update(schema.localUsers)
    .set({ lastSignInAt: new Date() })
    .where(eq(schema.localUsers.id, id));
}
