import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "dns";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

// Force ALL DNS lookups in the process to prefer IPv4
dns.setDefaultResultOrder("ipv4first");

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // Force IPv4 by setting the fetch option on the postgres.js client
    const client = postgres(env.databaseUrl, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: false },
      connection: {
        search_path: "public",
      },
      fetch_types: false,
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
