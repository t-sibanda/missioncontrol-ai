import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

// Local file storage directory (relative to cwd in production)
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Register local file upload/download routes on the Hono app.
 * These handle the fallback when no S3/OSS credentials are configured.
 *
 * Routes:
 *   PUT  /api/upload/local?key=<fileKey>  — upload a file
 *   GET  /api/files/*                     — download a file
 */
export function registerLocalFileRoutes(app: App) {
  ensureUploadDir();

  // Upload handler: PUT /api/upload/local?key=users/123/resume_pdf/abc-file.pdf
  app.put("/api/upload/local", async (c) => {
    const key = c.req.query("key");
    if (!key) {
      return c.json({ error: "Missing 'key' query parameter" }, 400);
    }

    // Sanitize key to prevent directory traversal
    const sanitizedKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
    const filePath = path.join(UPLOAD_DIR, sanitizedKey);

    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Read the request body as an ArrayBuffer and write to disk
    const body = await c.req.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return c.json({ error: "Empty request body" }, 400);
    }

    fs.writeFileSync(filePath, Buffer.from(body));

    return c.json({ success: true, key: sanitizedKey }, 200);
  });

  // Download handler: GET /api/files/users/123/resume_pdf/abc-file.pdf
  app.get("/api/files/*", (c) => {
    const requestPath = c.req.path.replace(/^\/api\/files\//, "");
    if (!requestPath) {
      return c.json({ error: "File path required" }, 400);
    }

    // Sanitize to prevent directory traversal
    const sanitizedPath = requestPath.replace(/\.\./g, "").replace(/^\/+/, "");
    const filePath = path.join(UPLOAD_DIR, sanitizedPath);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return c.json({ error: "File not found" }, 404);
    }

    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".txt": "text/plain",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return c.body(content, 200, {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      "Cache-Control": "private, max-age=3600",
    });
  });

  // Delete handler: DELETE /api/files/users/123/resume_pdf/abc-file.pdf
  app.delete("/api/files/*", (c) => {
    const requestPath = c.req.path.replace(/^\/api\/files\//, "");
    if (!requestPath) {
      return c.json({ error: "File path required" }, 400);
    }

    const sanitizedPath = requestPath.replace(/\.\./g, "").replace(/^\/+/, "");
    const filePath = path.join(UPLOAD_DIR, sanitizedPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
    }

    return c.json({ success: true });
  });
}
