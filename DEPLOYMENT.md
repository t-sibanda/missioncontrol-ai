# MissionControl AI — Deployment Guide

## Architecture

| Service | Purpose | Account |
|---------|---------|---------|
| **GitHub** | Source code + CI/CD | Your GitHub account |
| **Supabase** | PostgreSQL database + File storage | Your Supabase account |
| **Cloudflare Pages** | Frontend hosting (CDN) | Your Cloudflare account |
| **Render.com** (free) | Backend API server | Free signup |

---

## Step 1: Push Code to GitHub

### 1.1 Create a new repository on GitHub
- Go to https://github.com/new
- Name: `missioncontrol-ai` (or whatever you prefer)
- Make it private or public
- **Do NOT** initialize with README (we already have one)

### 1.2 Push your code
```bash
cd /path/to/your/missioncontrol-ai

# Set your new repo as remote
git remote remove origin  # remove the old one
git remote add origin https://github.com/YOUR_USERNAME/missioncontrol-ai.git

# Push everything
git branch -M main
git push -u origin main --force
```

---

## Step 2: Set Up Supabase (Database + Storage)

### 2.1 Create a new Supabase project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose your organization
4. **Project name**: `missioncontrol-ai`
5. **Database password**: Generate a strong one, save it!
6. **Region**: Choose closest to your users (e.g., US East)
7. Click "Create new project" — wait ~2 minutes

### 2.2 Get your database connection string
1. In your project, go to **Project Settings** (gear icon)
2. Click **Database**
3. Under **Connection string**, select **URI** format
4. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxx.supabase.co:5432/postgres
   ```
5. **Save this** — you'll need it in Step 4

### 2.3 Create the storage bucket for resumes
1. In Supabase dashboard, go to **Storage** (left sidebar)
2. Click **New bucket**
3. Name: `resumes`
4. Uncheck "Public bucket" (we want private)
5. Click **Save**
6. Click on the `resumes` bucket → **Policies** → **New policy**
7. Add a policy: `Allow all operations for authenticated users`
   - Template: `For full customization`
   - Allowed operation: `ALL`
   - Target roles: `authenticated`
   - Policy definition: `true`
8. Click **Review** → **Save policy**

---

## Step 3: Migrate Database from MySQL to PostgreSQL

The app currently uses MySQL. Supabase uses PostgreSQL. We need to:

### 3.1 Install PostgreSQL dependencies
```bash
npm uninstall drizzle-orm mysql2
npm install drizzle-orm@latest postgres
npm install -D @types/pg
```

### 3.2 Update the database connection
Edit `api/queries/connection.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const client = postgres(env.databaseUrl);
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
```

### 3.3 Update drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 3.4 Update .env
Replace the MySQL DATABASE_URL with your Supabase PostgreSQL URI:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxx.supabase.co:5432/postgres
```

### 3.5 Regenerate migrations and push schema
```bash
# Delete old MySQL migrations
rm -rf db/migrations/*

# Generate new PostgreSQL migrations
npx drizzle-kit generate

# Push to Supabase
npx drizzle-kit migrate
```

---

## Step 4: Set Up Backend on Render.com (Free)

### 4.1 Sign up / Log in
- Go to https://dashboard.render.com
- Sign up with GitHub (easiest)

### 4.2 Create a new Web Service
1. Click **New +** → **Web Service**
2. Connect your GitHub repo `missioncontrol-ai`
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `missioncontrol-api` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/boot.js` |
| **Plan** | `Free` |

4. Click **Advanced** → add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase PostgreSQL connection URI |
| `APP_ID` | From your `.env` file |
| `APP_SECRET` | From your `.env` file |
| `KIMI_AUTH_URL` | `https://auth.kimi.com` |
| `KIMI_OPEN_URL` | `https://open.kimi.com` |
| `OWNER_UNION_ID` | From your `.env` file |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |

5. To get **Supabase project URL** and **service role key**:
   - In Supabase dashboard → **Project Settings** → **API**
   - `SUPABASE_URL` = "Project URL" (e.g., `https://xxxxxxx.supabase.co`)
   - `SUPABASE_SERVICE_KEY` = "service_role" secret (NOT the anon key!)

6. Click **Create Web Service**
7. Wait for the build (~3-5 minutes)
8. Note your Render URL: `https://missioncontrol-api.onrender.com`

---

## Step 5: Deploy Frontend to Cloudflare Pages

### 5.1 Prepare the frontend build
First, update `src/providers/trpc.tsx` to point to your Render backend:

```typescript
// In src/providers/trpc.tsx
const API_URL = import.meta.env.VITE_API_URL || "/api";

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${API_URL}/trpc`,
          // ... rest of config
        }),
      ],
    })
  );
  // ...
}
```

Also update the OAuth callback URL in your Kimi app settings to:
`https://missioncontrol.pages.dev/api/oauth/callback`

### 5.2 Build and deploy
```bash
# Build the frontend
npm run build

# The frontend assets are in dist/public/
```

### 5.3 Deploy via Cloudflare dashboard
1. Go to https://dash.cloudflare.com
2. Click **Pages** (left sidebar)
3. Click **Create a project** → **Connect to Git**
4. Select your GitHub repo `missioncontrol-ai`
5. Configure:

| Setting | Value |
|---------|-------|
| **Project name** | `missioncontrol` |
| **Production branch** | `main` |
| **Framework preset** | `Create React App` (or `None`) |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `dist/public` |

6. Click **Environment variables** → add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://missioncontrol-api.onrender.com` |
| `VITE_APP_ID` | From your `.env` |
| `VITE_KIMI_AUTH_URL` | `https://auth.kimi.com` |

7. Click **Save and Deploy**
8. Wait for build (~2 minutes)
9. Your site will be at: `https://missioncontrol.pages.dev`

---

## Step 6: Configure CORS (Important!)

Your Render backend needs to accept requests from your Cloudflare Pages domain.

Edit `api/boot.ts` and add CORS:

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";

const app = new Hono();

// Add CORS before other routes
app.use("*", cors({
  origin: [
    "https://missioncontrol.pages.dev",
    "http://localhost:3000",  // for local dev
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
// ... rest of your routes
```

Then push and re-deploy:
```bash
git add .
git commit -m "Add CORS for Cloudflare Pages"
git push origin main
```

---

## Step 7: Set Up GitHub Actions (Auto-Deploy)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_APP_ID: ${{ secrets.VITE_APP_ID }}
          VITE_KIMI_AUTH_URL: ${{ secrets.VITE_KIMI_AUTH_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: missioncontrol
          directory: dist/public

      - name: Deploy API to Render
        run: |
          curl -X POST "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}"
```

### Add GitHub Secrets:
In your GitHub repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | How to get |
|--------|-----------|
| `VITE_API_URL` | Your Render URL: `https://missioncontrol-api.onrender.com` |
| `VITE_APP_ID` | From `.env` file |
| `VITE_KIMI_AUTH_URL` | `https://auth.kimi.com` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token** (use "Cloudflare Pages" template) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar shows your Account ID |
| `RENDER_SERVICE_ID` | Render dashboard → your service → copy the service ID from URL |
| `RENDER_API_KEY` | Render dashboard → **Account Settings** → **API Keys** |

---

## Step 8: Configure OAuth Redirect URLs

Go back to the **Kimi OAuth portal** where you created your app and update the callback URL:

- **Development**: `http://localhost:3000/api/oauth/callback`
- **Production**: `https://missioncontrol.pages.dev/api/oauth/callback`

Add both if you want to support local dev too.

---

## Final Architecture

```
User Browser
     │
     ▼
Cloudflare Pages (https://missioncontrol.pages.dev)
     │  Frontend React app (static files)
     │
     ▼  API calls via HTTPS
Render.com (https://missioncontrol-api.onrender.com)
     │  Hono + tRPC API server (Node.js)
     │
     ▼  SQL queries via connection pool
Supabase PostgreSQL (db.xxxxx.supabase.co:5432)
     │  Database: jobs, companies, resumes, applications...
     │
     ▼  File uploads
Supabase Storage (resumes bucket)
```

---

## Troubleshooting

### "Database connection failed"
- Check your `DATABASE_URL` uses the correct Supabase password
- Make sure you're using the **connection pooler** URL (port 6543) not the direct DB URL
- Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres`

### "CORS error" in browser
- Make sure `api/boot.ts` has CORS configured with your Pages domain
- Restart the Render service after pushing changes

### "OAuth callback fails"
- Check that the callback URL in Kimi app settings matches your production URL
- Make sure `VITE_KIMI_AUTH_URL` is set correctly in Cloudflare environment

### "Build fails on Render"
- Check Render build logs
- Make sure all environment variables are set
- Ensure `npm run build` works locally first

---

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| **Supabase** | 500MB DB, 1GB storage, 2M Edge Function calls/month |
| **Cloudflare Pages** | Unlimited requests, 500 builds/month |
| **Render** | 512MB RAM, sleeps after 15min inactivity (~30s cold start) |

---

## Next Steps After Deploy

1. **Set up a custom domain** on Cloudflare Pages (free!)
   - Pages → your project → **Custom domains** → add `missioncontrol.yourdomain.com`
2. **Enable email notifications** — update Settings with your email
3. **Run your first scraper** — go to Scraper tab, hit "Run Scraper"
4. **Upload your resume** — go to Resume tab, create a profile, upload PDF
