import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  if (!fs.existsSync(distPath)) {
    console.error(`[serveStatic] dist/public not found at: ${distPath}`);
    return;
  }

  console.log(`[serveStatic] Serving files from: ${distPath}`);

  // Serve static files (skip API routes)
  app.use("*", async (c, next) => {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/")) {
      return next();
    }
    return serveStatic({ root: distPath })(c, next);
  });

  // SPA fallback: serve index.html for browser routes
  app.notFound((c) => {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, "utf-8"));
    }
    return c.json({ error: "index.html not found" }, 404);
  });
}