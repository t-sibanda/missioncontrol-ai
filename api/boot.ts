import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { registerLocalFileRoutes } from "./local-files";

const app = new Hono<{ Bindings: HttpBindings }>();

// CORS - dynamic origin checking
app.use("*", cors({
  origin: (origin) => {
    // Allow local dev
    if (
      origin === "http://localhost:3000" ||
      origin === "http://localhost:5173" ||
      origin === "http://localhost:8788"
    ) {
      return origin;
    }
    // Allow any Cloudflare Pages preview/production domain
    if (origin.endsWith(".pages.dev")) {
      return origin;
    }
    // Allow the exact FRONTEND_URL from env
    if (env.frontendUrl && origin === env.frontendUrl) {
      return origin;
    }
    // Allow Render's own domain (when frontend is served from same origin)
    if (origin.endsWith(".onrender.com")) {
      return origin;
    }
    return origin;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
  credentials: true,
  exposeHeaders: ["set-cookie"],
}));

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// Local file upload/download routes (fallback when no S3/OSS configured)
registerLocalFileRoutes(app);

// Health check endpoint — tests DB connection and returns exact error if any
app.get("/api/health", async (c) => {
  const info: Record<string, unknown> = {
    server: "ok",
    timestamp: new Date().toISOString(),
    dbUrl: env.databaseUrl
      ? env.databaseUrl.replace(/:[^:@]+@/, ":***@") // hide password
      : "NOT SET",
  };

  try {
    const { default: dns } = await import("dns");
    dns.setDefaultResultOrder("ipv4first");
    const { default: postgres } = await import("postgres");
    const sql = postgres(env.databaseUrl, {
      prepare: false,
      max: 1,
      ssl: { rejectUnauthorized: false },
      idle_timeout: 5,
      connect_timeout: 10,
    });
    const result = await sql`SELECT current_database() as db, current_schema() as schema, now() as time`;
    info.database = "connected";
    info.result = result;
    await sql.end();
  } catch (err: unknown) {
    info.database = "FAILED";
    info.error = err instanceof Error ? err.message : String(err);
    info.stack = err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined;
  }

  return c.json(info);
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
