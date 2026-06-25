import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "dns";
import { promisify } from "util";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

dns.setDefaultResultOrder("ipv4first");
const lookup4 = promisify(dns.resolve4);

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // Parse the DATABASE_URL and force the socket to connect via IPv4
    const client = postgres(env.databaseUrl, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: false },
      fetch_types: false,
      connection: {
        search_path: "public",
      },
      socket: () => {
        // Force IPv4 by providing a custom socket creator
        const net = require("net") as typeof import("net");
        const url = new URL(env.databaseUrl);
        const socket = net.connect({
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          family: 4, // Force IPv4
        });
        return socket;
      },
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
