import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

type App = Hono<{ Bindings: HttpBindings }>;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".map": "application/json",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

export function serveStaticFiles(app: App) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  const possiblePaths = [
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "../dist/public"),
    path.resolve(currentDir, "../../dist/public"),
    path.resolve(currentDir, "../dist/public"),
  ];

  let distPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const indexPath = path.join(p, "index.html");
      if (fs.existsSync(indexPath)) {
        distPath = p;
        break;
      }
    }
  }

  if (!distPath) {
    console.error("[serveStatic] ERROR: Could not find dist/public!");
    console.error("[serveStatic] cwd:", process.cwd());
    return;
  }

  console.log(`[serveStatic] Serving from: ${distPath}`);

  app.use("*", async (c, next) => {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/")) {
      return next();
    }

    const safePath = url.pathname.replace(/\.{2,}/g, "");
    const filePath = path.join(distPath, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath);
      return c.body(content, 200, { "Content-Type": getMimeType(filePath) });
    }

    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      return c.html(content);
    }

    return next();
  });
}