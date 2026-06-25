import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "dns";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

// Force IPv4 resolution — Render's free tier can't reach Supabase over IPv6
dns.setDefaultResultOrder("ipv4first");

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const client = postgres(env.databaseUrl, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: false },
      connection: {
        search_path: "public",
      },
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
